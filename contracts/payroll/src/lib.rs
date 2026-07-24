#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, token, Address, Env, Vec,
};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum PayrollError {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    Unauthorized = 3,
    DuplicateEmployee = 4,
    EmployeeNotFound = 5,
    InvalidSalaryAmount = 6,
    InsufficientContractBalance = 7,
    AlreadyPaidThisCycle = 8,
    ContractPaused = 9,
    MaxEmployeesReached = 10,
    NothingToWithdraw = 11,
    UnpaidEmployeesRemain = 12,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct EmployeeData {
    pub address: Address,
    pub salary: i128,
    pub active: bool,
    pub last_paid_cycle: u32,
}

#[contracttype]
pub enum DataKey {
    Admin,
    Initialized,
    Employee(Address),
    EmployeeList,
    PayrollCycle,
    Token,
    Paused,
}

/// Hard cap so `pay_salaries` stays within Soroban resource limits.
const MAX_EMPLOYEES: u32 = 50;

// TTL thresholds (ledgers). Extend when remaining TTL falls below threshold.
const INSTANCE_TTL_THRESHOLD: u32 = 100_000;
const INSTANCE_TTL_EXTEND_TO: u32 = 500_000;
const PERSISTENT_TTL_THRESHOLD: u32 = 100_000;
const PERSISTENT_TTL_EXTEND_TO: u32 = 500_000;

#[contract]
pub struct PayrollContract;

// --- internal helpers -------------------------------------------------------

fn require_admin(env: &Env) -> Result<Address, PayrollError> {
    let admin: Address = env
        .storage()
        .instance()
        .get(&DataKey::Admin)
        .ok_or(PayrollError::NotInitialized)?;
    admin.require_auth();
    Ok(admin)
}

fn require_not_paused(env: &Env) -> Result<(), PayrollError> {
    let paused: bool = env
        .storage()
        .instance()
        .get(&DataKey::Paused)
        .unwrap_or(false);
    if paused {
        return Err(PayrollError::ContractPaused);
    }
    Ok(())
}

fn extend_instance_ttl(env: &Env) {
    env.storage()
        .instance()
        .extend_ttl(INSTANCE_TTL_THRESHOLD, INSTANCE_TTL_EXTEND_TO);
}

fn extend_employee_ttl(env: &Env, emp_key: &DataKey) {
    env.storage().persistent().extend_ttl(
        emp_key,
        PERSISTENT_TTL_THRESHOLD,
        PERSISTENT_TTL_EXTEND_TO,
    );
}

fn current_cycle(env: &Env) -> u32 {
    env.storage()
        .instance()
        .get(&DataKey::PayrollCycle)
        .unwrap_or(0)
}

fn employee_list(env: &Env) -> Vec<Address> {
    env.storage()
        .instance()
        .get(&DataKey::EmployeeList)
        .unwrap_or_else(|| Vec::new(env))
}

fn stored_token(env: &Env) -> Result<Address, PayrollError> {
    env.storage()
        .instance()
        .get(&DataKey::Token)
        .ok_or(PayrollError::NotInitialized)
}

/// Active employee is unpaid for `cycle` when `last_paid_cycle <= cycle`.
/// Encoding: new employees start at 0; after pay for cycle N, last_paid_cycle = N+1.
fn is_unpaid(emp: &EmployeeData, cycle: u32) -> bool {
    emp.active && emp.salary > 0 && emp.last_paid_cycle <= cycle
}

fn unpaid_payroll_total(env: &Env, cycle: u32) -> i128 {
    let list = employee_list(env);
    let mut total: i128 = 0;
    for emp_addr in list.iter() {
        let emp_key = DataKey::Employee(emp_addr);
        if let Some(emp_data) = env.storage().persistent().get::<DataKey, EmployeeData>(&emp_key) {
            if is_unpaid(&emp_data, cycle) {
                total += emp_data.salary;
            }
        }
    }
    total
}

fn has_unpaid_active(env: &Env, cycle: u32) -> bool {
    let list = employee_list(env);
    for emp_addr in list.iter() {
        let emp_key = DataKey::Employee(emp_addr);
        if let Some(emp_data) = env.storage().persistent().get::<DataKey, EmployeeData>(&emp_key) {
            if is_unpaid(&emp_data, cycle) {
                return true;
            }
        }
    }
    false
}

#[contractimpl]
impl PayrollContract {
    /// Initialize contract with admin and pinned payroll token (e.g. native SAC).
    pub fn initialize(env: Env, admin: Address, token: Address) -> Result<(), PayrollError> {
        if env.storage().instance().has(&DataKey::Initialized) {
            return Err(PayrollError::AlreadyInitialized);
        }

        admin.require_auth();

        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Token, &token);
        env.storage().instance().set(&DataKey::Initialized, &true);
        env.storage().instance().set(&DataKey::PayrollCycle, &0u32);
        env.storage().instance().set(&DataKey::Paused, &false);

        let empty_list: Vec<Address> = Vec::new(&env);
        env.storage()
            .instance()
            .set(&DataKey::EmployeeList, &empty_list);

        extend_instance_ttl(&env);
        Ok(())
    }

    /// Return contract admin address.
    pub fn get_admin(env: Env) -> Result<Address, PayrollError> {
        env.storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(PayrollError::NotInitialized)
    }

    /// Return pinned payroll token address.
    pub fn get_token(env: Env) -> Result<Address, PayrollError> {
        stored_token(&env)
    }

    /// Whether the contract is paused.
    pub fn is_paused(env: Env) -> bool {
        env.storage()
            .instance()
            .get(&DataKey::Paused)
            .unwrap_or(false)
    }

    /// Pause or unpause the contract (admin only).
    ///
    /// When paused: blocks add/update salary, pay, next_cycle, withdraw.
    /// Still allowed: unpause, transfer_admin, remove, set_employee_active, getters.
    pub fn set_paused(env: Env, paused: bool) -> Result<(), PayrollError> {
        require_admin(&env)?;
        env.storage().instance().set(&DataKey::Paused, &paused);
        extend_instance_ttl(&env);
        env.events()
            .publish((symbol_short!("pause"),), if paused { 1i128 } else { 0i128 });
        Ok(())
    }

    /// Transfer admin role to a new address (admin only).
    pub fn transfer_admin(env: Env, new_admin: Address) -> Result<(), PayrollError> {
        require_admin(&env)?;
        env.storage().instance().set(&DataKey::Admin, &new_admin);
        extend_instance_ttl(&env);
        env.events()
            .publish((symbol_short!("adm_xfer"), new_admin), 0i128);
        Ok(())
    }

    /// Withdraw tokens from the contract to `to` (admin only, not paused).
    /// Uses the pinned token only — excess / leftover funds can be recovered.
    pub fn withdraw(env: Env, to: Address, amount: i128) -> Result<(), PayrollError> {
        require_admin(&env)?;
        require_not_paused(&env)?;

        if amount <= 0 {
            return Err(PayrollError::NothingToWithdraw);
        }

        let token_addr = stored_token(&env)?;
        let token_client = token::Client::new(&env, &token_addr);
        let contract_address = env.current_contract_address();
        let balance = token_client.balance(&contract_address);
        if balance < amount {
            return Err(PayrollError::InsufficientContractBalance);
        }

        token_client.transfer(&contract_address, &to, &amount);
        extend_instance_ttl(&env);

        env.events()
            .publish((symbol_short!("withdraw"), to), amount);
        Ok(())
    }

    /// Add an employee to the payroll roster (Admin only).
    pub fn add_employee(env: Env, employee: Address, salary: i128) -> Result<(), PayrollError> {
        require_admin(&env)?;
        require_not_paused(&env)?;

        if salary <= 0 {
            return Err(PayrollError::InvalidSalaryAmount);
        }

        let emp_key = DataKey::Employee(employee.clone());
        if env.storage().persistent().has(&emp_key) {
            return Err(PayrollError::DuplicateEmployee);
        }

        let mut list = employee_list(&env);
        if list.len() >= MAX_EMPLOYEES {
            return Err(PayrollError::MaxEmployeesReached);
        }

        let data = EmployeeData {
            address: employee.clone(),
            salary,
            active: true,
            last_paid_cycle: 0,
        };

        env.storage().persistent().set(&emp_key, &data);
        extend_employee_ttl(&env, &emp_key);

        list.push_back(employee.clone());
        env.storage().instance().set(&DataKey::EmployeeList, &list);
        extend_instance_ttl(&env);

        env.events()
            .publish((symbol_short!("emp_add"), employee), salary);

        Ok(())
    }

    /// Remove an employee from the payroll roster (Admin only).
    /// Allowed even when paused so admin can shrink the roster in an emergency.
    pub fn remove_employee(env: Env, employee: Address) -> Result<(), PayrollError> {
        require_admin(&env)?;

        let emp_key = DataKey::Employee(employee.clone());
        if !env.storage().persistent().has(&emp_key) {
            return Err(PayrollError::EmployeeNotFound);
        }

        env.storage().persistent().remove(&emp_key);

        let list = employee_list(&env);
        let mut new_list: Vec<Address> = Vec::new(&env);
        for item in list.iter() {
            if item != employee {
                new_list.push_back(item);
            }
        }
        env.storage()
            .instance()
            .set(&DataKey::EmployeeList, &new_list);
        extend_instance_ttl(&env);

        env.events()
            .publish((symbol_short!("emp_rm"), employee), 0i128);

        Ok(())
    }

    /// Update employee salary (Admin only).
    pub fn update_employee_salary(
        env: Env,
        employee: Address,
        new_salary: i128,
    ) -> Result<(), PayrollError> {
        require_admin(&env)?;
        require_not_paused(&env)?;

        if new_salary <= 0 {
            return Err(PayrollError::InvalidSalaryAmount);
        }

        let emp_key = DataKey::Employee(employee.clone());
        let mut data: EmployeeData = env
            .storage()
            .persistent()
            .get(&emp_key)
            .ok_or(PayrollError::EmployeeNotFound)?;

        data.salary = new_salary;
        env.storage().persistent().set(&emp_key, &data);
        extend_employee_ttl(&env, &emp_key);
        extend_instance_ttl(&env);

        env.events()
            .publish((symbol_short!("emp_upd"), employee), new_salary);

        Ok(())
    }

    /// Soft-activate or deactivate an employee (Admin only).
    /// Allowed when paused for emergency roster control.
    pub fn set_employee_active(
        env: Env,
        employee: Address,
        active: bool,
    ) -> Result<(), PayrollError> {
        require_admin(&env)?;

        let emp_key = DataKey::Employee(employee.clone());
        let mut data: EmployeeData = env
            .storage()
            .persistent()
            .get(&emp_key)
            .ok_or(PayrollError::EmployeeNotFound)?;

        data.active = active;
        env.storage().persistent().set(&emp_key, &data);
        extend_employee_ttl(&env, &emp_key);
        extend_instance_ttl(&env);

        env.events().publish(
            (symbol_short!("emp_act"), employee),
            if active { 1i128 } else { 0i128 },
        );

        Ok(())
    }

    /// Get single employee details.
    pub fn get_employee(env: Env, employee: Address) -> Result<EmployeeData, PayrollError> {
        let emp_key = DataKey::Employee(employee);
        env.storage()
            .persistent()
            .get(&emp_key)
            .ok_or(PayrollError::EmployeeNotFound)
    }

    /// Get all employee addresses.
    pub fn get_employees(env: Env) -> Result<Vec<Address>, PayrollError> {
        Ok(employee_list(&env))
    }

    /// Total monthly payroll for all active employees (full-cycle obligation).
    pub fn get_total_payroll(env: Env) -> Result<i128, PayrollError> {
        let list = employee_list(&env);
        let mut total: i128 = 0;
        for emp_addr in list.iter() {
            let emp_key = DataKey::Employee(emp_addr);
            if let Some(emp_data) = env.storage().persistent().get::<DataKey, EmployeeData>(&emp_key)
            {
                if emp_data.active {
                    total += emp_data.salary;
                }
            }
        }
        Ok(total)
    }

    /// Unpaid active payroll for the current cycle (what `pay_salaries` still needs).
    pub fn get_unpaid_payroll(env: Env) -> Result<i128, PayrollError> {
        let cycle = current_cycle(&env);
        Ok(unpaid_payroll_total(&env, cycle))
    }

    /// Execute salary payouts to unpaid active employees (Admin only).
    ///
    /// Uses the token pinned at `initialize`. Each employee is paid at most once
    /// per cycle (`last_paid_cycle <= current_cycle`). After a successful full
    /// pay, call `next_cycle()` to advance.
    pub fn pay_salaries(env: Env) -> Result<u32, PayrollError> {
        require_admin(&env)?;
        require_not_paused(&env)?;

        let current = current_cycle(&env);
        let unpaid_required = unpaid_payroll_total(&env, current);
        if unpaid_required <= 0 {
            return Ok(0);
        }

        let token_addr = stored_token(&env)?;
        let token_client = token::Client::new(&env, &token_addr);
        let contract_address = env.current_contract_address();
        let balance = token_client.balance(&contract_address);

        if balance < unpaid_required {
            return Err(PayrollError::InsufficientContractBalance);
        }

        let list = employee_list(&env);
        let mut count: u32 = 0;
        for emp_addr in list.iter() {
            let emp_key = DataKey::Employee(emp_addr.clone());
            if let Some(mut emp_data) = env
                .storage()
                .persistent()
                .get::<DataKey, EmployeeData>(&emp_key)
            {
                if is_unpaid(&emp_data, current) {
                    token_client.transfer(&contract_address, &emp_addr, &emp_data.salary);
                    emp_data.last_paid_cycle = current + 1;
                    env.storage().persistent().set(&emp_key, &emp_data);
                    extend_employee_ttl(&env, &emp_key);
                    count += 1;

                    env.events()
                        .publish((symbol_short!("sal_paid"), emp_addr), emp_data.salary);
                }
            }
        }

        extend_instance_ttl(&env);

        env.events()
            .publish((symbol_short!("cyc_done"), current), unpaid_required);

        Ok(count)
    }

    /// Advance to the next payroll cycle (Admin only).
    ///
    /// Refuses to advance while any active employee is still unpaid for the
    /// current cycle, preventing silent payroll skips.
    pub fn next_cycle(env: Env) -> Result<u32, PayrollError> {
        require_admin(&env)?;
        require_not_paused(&env)?;

        let current = current_cycle(&env);
        if has_unpaid_active(&env, current) {
            return Err(PayrollError::UnpaidEmployeesRemain);
        }

        let next = current + 1;
        env.storage().instance().set(&DataKey::PayrollCycle, &next);
        extend_instance_ttl(&env);

        env.events()
            .publish((symbol_short!("cyc_next"), next), 0i128);

        Ok(next)
    }

    /// Return current payroll cycle ID.
    pub fn get_cycle(env: Env) -> u32 {
        current_cycle(&env)
    }
}

#[cfg(test)]
mod test;
