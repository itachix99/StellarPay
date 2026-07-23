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
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct EmployeeData {
    pub address: Address,
    pub salary: i128,
    pub active: bool,
}

#[contracttype]
pub enum DataKey {
    Admin,
    Initialized,
    Employee(Address),
    EmployeeList,
    PayrollCycle,
}

#[contract]
pub struct PayrollContract;

#[contractimpl]
impl PayrollContract {
    /// Initialize contract with admin address.
    pub fn initialize(env: Env, admin: Address) -> Result<(), PayrollError> {
        if env.storage().instance().has(&DataKey::Initialized) {
            return Err(PayrollError::AlreadyInitialized);
        }

        admin.require_auth();

        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Initialized, &true);
        env.storage().instance().set(&DataKey::PayrollCycle, &0u32);

        let empty_list: Vec<Address> = Vec::new(&env);
        env.storage().instance().set(&DataKey::EmployeeList, &empty_list);

        Ok(())
    }

    /// Return contract admin address.
    pub fn get_admin(env: Env) -> Result<Address, PayrollError> {
        env.storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(PayrollError::NotInitialized)
    }

    /// Add an employee to the payroll roster (Admin only).
    pub fn add_employee(env: Env, employee: Address, salary: i128) -> Result<(), PayrollError> {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(PayrollError::NotInitialized)?;
        admin.require_auth();

        if salary <= 0 {
            return Err(PayrollError::InvalidSalaryAmount);
        }

        let emp_key = DataKey::Employee(employee.clone());
        if env.storage().persistent().has(&emp_key) {
            return Err(PayrollError::DuplicateEmployee);
        }

        let data = EmployeeData {
            address: employee.clone(),
            salary,
            active: true,
        };

        env.storage().persistent().set(&emp_key, &data);

        let mut list: Vec<Address> = env
            .storage()
            .instance()
            .get(&DataKey::EmployeeList)
            .unwrap_or_else(|| Vec::new(&env));

        list.push_back(employee.clone());
        env.storage().instance().set(&DataKey::EmployeeList, &list);

        // Emit Event
        env.events().publish(
            (symbol_short!("emp_add"), employee.clone()),
            salary,
        );

        Ok(())
    }

    /// Remove an employee from the payroll roster (Admin only).
    pub fn remove_employee(env: Env, employee: Address) -> Result<(), PayrollError> {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(PayrollError::NotInitialized)?;
        admin.require_auth();

        let emp_key = DataKey::Employee(employee.clone());
        if !env.storage().persistent().has(&emp_key) {
            return Err(PayrollError::EmployeeNotFound);
        }

        env.storage().persistent().remove(&emp_key);

        let list: Vec<Address> = env
            .storage()
            .instance()
            .get(&DataKey::EmployeeList)
            .unwrap_or_else(|| Vec::new(&env));

        let mut new_list: Vec<Address> = Vec::new(&env);
        for item in list.iter() {
            if item != employee {
                new_list.push_back(item);
            }
        }
        env.storage().instance().set(&DataKey::EmployeeList, &new_list);

        // Emit Event
        env.events().publish(
            (symbol_short!("emp_rm"), employee.clone()),
            0i128,
        );

        Ok(())
    }

    /// Update employee salary (Admin only).
    pub fn update_employee_salary(
        env: Env,
        employee: Address,
        new_salary: i128,
    ) -> Result<(), PayrollError> {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(PayrollError::NotInitialized)?;
        admin.require_auth();

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

        // Emit Event
        env.events().publish(
            (symbol_short!("emp_upd"), employee),
            new_salary,
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
        Ok(env
            .storage()
            .instance()
            .get(&DataKey::EmployeeList)
            .unwrap_or_else(|| Vec::new(&env)))
    }

    /// Calculate total monthly payroll requirement in stroops.
    pub fn get_total_payroll(env: Env) -> Result<i128, PayrollError> {
        let list: Vec<Address> = env
            .storage()
            .instance()
            .get(&DataKey::EmployeeList)
            .unwrap_or_else(|| Vec::new(&env));

        let mut total: i128 = 0;
        for emp_addr in list.iter() {
            let emp_key = DataKey::Employee(emp_addr);
            if let Some(emp_data) = env.storage().persistent().get::<DataKey, EmployeeData>(&emp_key) {
                if emp_data.active {
                    total += emp_data.salary;
                }
            }
        }
        Ok(total)
    }

    /// Execute salary payouts to all active employees using native token or asset contract (Admin only).
    pub fn pay_salaries(env: Env, native_token_address: Address) -> Result<u32, PayrollError> {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(PayrollError::NotInitialized)?;
        admin.require_auth();

        let total_required = Self::get_total_payroll(env.clone())?;
        if total_required <= 0 {
            return Ok(0);
        }

        let token_client = token::Client::new(&env, &native_token_address);
        let contract_address = env.current_contract_address();
        let balance = token_client.balance(&contract_address);

        if balance < total_required {
            return Err(PayrollError::InsufficientContractBalance);
        }

        let list: Vec<Address> = env
            .storage()
            .instance()
            .get(&DataKey::EmployeeList)
            .unwrap_or_else(|| Vec::new(&env));

        let mut count: u32 = 0;
        for emp_addr in list.iter() {
            let emp_key = DataKey::Employee(emp_addr.clone());
            if let Some(emp_data) = env.storage().persistent().get::<DataKey, EmployeeData>(&emp_key) {
                if emp_data.active && emp_data.salary > 0 {
                    token_client.transfer(&contract_address, &emp_addr, &emp_data.salary);
                    count += 1;

                    // Emit event for individual salary payout
                    env.events().publish(
                        (symbol_short!("sal_paid"), emp_addr),
                        emp_data.salary,
                    );
                }
            }
        }

        // Increment payroll cycle
        let current_cycle: u32 = env
            .storage()
            .instance()
            .get(&DataKey::PayrollCycle)
            .unwrap_or(0);
        let next_cycle = current_cycle + 1;
        env.storage().instance().set(&DataKey::PayrollCycle, &next_cycle);

        // Emit cycle completion event
        env.events().publish(
            (symbol_short!("cyc_done"), next_cycle),
            total_required,
        );

        Ok(count)
    }

    /// Return current payroll cycle ID.
    pub fn get_cycle(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::PayrollCycle)
            .unwrap_or(0)
    }
}

#[cfg(test)]
mod test;
