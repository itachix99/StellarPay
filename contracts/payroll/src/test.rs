#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, token, Address, Env};

fn setup_test_env() -> (Env, Address, Address, PayrollContractClient<'static>) {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(PayrollContract, ());
    let client = PayrollContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);

    let token_admin = Address::generate(&env);
    let token_contract = env.register_stellar_asset_contract_v2(token_admin.clone());
    let token_id = token_contract.address();

    (env, admin, token_id, client)
}

fn mint(env: &Env, token_id: &Address, to: &Address, amount: i128) {
    let token_admin_client = token::StellarAssetClient::new(env, token_id);
    token_admin_client.mint(to, &amount);
}

fn token_balance(env: &Env, token_id: &Address, who: &Address) -> i128 {
    token::Client::new(env, token_id).balance(who)
}

#[test]
fn test_initialize() {
    let (_env, admin, token_id, client) = setup_test_env();

    client.initialize(&admin, &token_id);
    assert_eq!(client.get_admin(), admin);
    assert_eq!(client.get_token(), token_id);
    assert_eq!(client.get_cycle(), 0);
    assert!(!client.is_paused());
}

#[test]
fn test_add_and_get_employee() {
    let (env, admin, token_id, client) = setup_test_env();
    client.initialize(&admin, &token_id);

    let emp1 = Address::generate(&env);
    let salary = 500_0000000i128; // 500 XLM in stroops

    client.add_employee(&emp1, &salary);

    let emp_data = client.get_employee(&emp1);
    assert_eq!(emp_data.address, emp1);
    assert_eq!(emp_data.salary, salary);
    assert!(emp_data.active);

    let total = client.get_total_payroll();
    assert_eq!(total, salary);
}

#[test]
fn test_remove_employee() {
    let (env, admin, token_id, client) = setup_test_env();
    client.initialize(&admin, &token_id);

    let emp1 = Address::generate(&env);
    client.add_employee(&emp1, &100_0000000i128);

    assert_eq!(client.get_total_payroll(), 100_0000000i128);

    client.remove_employee(&emp1);

    assert_eq!(client.get_total_payroll(), 0i128);
    assert_eq!(client.get_employees().len(), 0);
}

#[test]
fn test_update_employee_salary() {
    let (env, admin, token_id, client) = setup_test_env();
    client.initialize(&admin, &token_id);

    let emp1 = Address::generate(&env);
    client.add_employee(&emp1, &100_0000000i128);

    client.update_employee_salary(&emp1, &250_0000000i128);

    let emp_data = client.get_employee(&emp1);
    assert_eq!(emp_data.salary, 250_0000000i128);
    assert_eq!(client.get_total_payroll(), 250_0000000i128);
}

#[test]
fn test_pay_salaries_success() {
    let (env, admin, token_id, client) = setup_test_env();
    client.initialize(&admin, &token_id);

    let emp1 = Address::generate(&env);
    let emp2 = Address::generate(&env);

    client.add_employee(&emp1, &100_0000000i128);
    client.add_employee(&emp2, &200_0000000i128);

    mint(&env, &token_id, &client.address, 500_0000000i128);
    assert_eq!(token_balance(&env, &token_id, &client.address), 500_0000000i128);

    let paid_count = client.pay_salaries();
    assert_eq!(paid_count, 2);

    assert_eq!(token_balance(&env, &token_id, &emp1), 100_0000000i128);
    assert_eq!(token_balance(&env, &token_id, &emp2), 200_0000000i128);
    assert_eq!(token_balance(&env, &token_id, &client.address), 200_0000000i128);

    // Cycle should not have advanced yet (next_cycle must be called)
    assert_eq!(client.get_cycle(), 0);
}

#[test]
fn test_pay_salaries_double_call_prevented() {
    let (env, admin, token_id, client) = setup_test_env();
    client.initialize(&admin, &token_id);

    let emp1 = Address::generate(&env);
    client.add_employee(&emp1, &100_0000000i128);

    // Fund contract with enough for 2 cycles
    mint(&env, &token_id, &client.address, 300_0000000i128);

    // First pay_salaries call — should succeed
    let paid_count = client.pay_salaries();
    assert_eq!(paid_count, 1);
    assert_eq!(token_balance(&env, &token_id, &emp1), 100_0000000i128);

    // Second pay_salaries call without advancing cycle — should pay 0
    let paid_count2 = client.pay_salaries();
    assert_eq!(paid_count2, 0);
    assert_eq!(token_balance(&env, &token_id, &emp1), 100_0000000i128);
    assert_eq!(token_balance(&env, &token_id, &client.address), 200_0000000i128);

    // Advance cycle
    let next = client.next_cycle();
    assert_eq!(next, 1);
    assert_eq!(client.get_cycle(), 1);

    // Now a new pay_salaries call should work
    let paid_count3 = client.pay_salaries();
    assert_eq!(paid_count3, 1);
    assert_eq!(token_balance(&env, &token_id, &emp1), 200_0000000i128);
    assert_eq!(token_balance(&env, &token_id, &client.address), 100_0000000i128);
}

#[test]
fn test_pay_salaries_insufficient_balance() {
    let (env, admin, token_id, client) = setup_test_env();
    client.initialize(&admin, &token_id);

    let emp1 = Address::generate(&env);
    client.add_employee(&emp1, &500_0000000i128);

    // Fund contract with less than required
    mint(&env, &token_id, &client.address, 100_0000000i128);

    let result = client.try_pay_salaries();
    assert_eq!(result, Err(Ok(PayrollError::InsufficientContractBalance)));
}

#[test]
fn test_add_employee_zero_salary_rejected() {
    let (env, admin, token_id, client) = setup_test_env();
    client.initialize(&admin, &token_id);

    let emp1 = Address::generate(&env);
    let result = client.try_add_employee(&emp1, &0i128);
    assert_eq!(result, Err(Ok(PayrollError::InvalidSalaryAmount)));
}

#[test]
fn test_initialize_already_initialized_error() {
    let (_env, admin, token_id, client) = setup_test_env();
    client.initialize(&admin, &token_id);

    let result = client.try_initialize(&admin, &token_id);
    assert_eq!(result, Err(Ok(PayrollError::AlreadyInitialized)));
}

#[test]
fn test_next_cycle_blocked_when_unpaid() {
    let (env, admin, token_id, client) = setup_test_env();
    client.initialize(&admin, &token_id);

    let emp1 = Address::generate(&env);
    client.add_employee(&emp1, &100_0000000i128);

    // Cannot advance while unpaid employees remain
    let result = client.try_next_cycle();
    assert_eq!(result, Err(Ok(PayrollError::UnpaidEmployeesRemain)));
    assert_eq!(client.get_cycle(), 0);
}

#[test]
fn test_next_cycle_after_full_pay() {
    let (env, admin, token_id, client) = setup_test_env();
    client.initialize(&admin, &token_id);

    let emp1 = Address::generate(&env);
    client.add_employee(&emp1, &100_0000000i128);
    mint(&env, &token_id, &client.address, 100_0000000i128);

    assert_eq!(client.pay_salaries(), 1);
    let next = client.next_cycle();
    assert_eq!(next, 1);
    assert_eq!(client.get_cycle(), 1);
}

#[test]
fn test_next_cycle_empty_roster_advances() {
    let (_env, admin, token_id, client) = setup_test_env();
    client.initialize(&admin, &token_id);

    // No employees → no unpaid → can advance
    assert_eq!(client.next_cycle(), 1);
    assert_eq!(client.next_cycle(), 2);
}

#[test]
fn test_remove_readd_employee_gets_paid() {
    let (env, admin, token_id, client) = setup_test_env();
    client.initialize(&admin, &token_id);

    let emp1 = Address::generate(&env);
    client.add_employee(&emp1, &100_0000000i128);

    // Pay cycle 0
    mint(&env, &token_id, &client.address, 300_0000000i128);
    client.pay_salaries();
    assert_eq!(token_balance(&env, &token_id, &emp1), 100_0000000i128);

    // Remove employee
    client.remove_employee(&emp1);
    assert_eq!(client.get_total_payroll(), 0i128);

    // Advance cycle (no unpaid active remain)
    client.next_cycle();

    // Re-add employee
    client.add_employee(&emp1, &100_0000000i128);

    // Pay cycle 1 — should pay the re-added employee
    let paid_count = client.pay_salaries();
    assert_eq!(paid_count, 1);
    assert_eq!(token_balance(&env, &token_id, &emp1), 200_0000000i128);
}

#[test]
fn test_withdraw_admin_recovers_excess() {
    let (env, admin, token_id, client) = setup_test_env();
    client.initialize(&admin, &token_id);

    let emp1 = Address::generate(&env);
    client.add_employee(&emp1, &100_0000000i128);
    mint(&env, &token_id, &client.address, 500_0000000i128);

    client.pay_salaries();
    // 400 left after paying 100
    assert_eq!(token_balance(&env, &token_id, &client.address), 400_0000000i128);

    client.withdraw(&admin, &250_0000000i128);
    assert_eq!(token_balance(&env, &token_id, &admin), 250_0000000i128);
    assert_eq!(token_balance(&env, &token_id, &client.address), 150_0000000i128);
}

#[test]
fn test_withdraw_zero_rejected() {
    let (_env, admin, token_id, client) = setup_test_env();
    client.initialize(&admin, &token_id);

    let result = client.try_withdraw(&admin, &0i128);
    assert_eq!(result, Err(Ok(PayrollError::NothingToWithdraw)));
}

#[test]
fn test_pay_salaries_balance_checks_unpaid_only() {
    let (env, admin, token_id, client) = setup_test_env();
    client.initialize(&admin, &token_id);

    let emp1 = Address::generate(&env);
    let emp2 = Address::generate(&env);
    client.add_employee(&emp1, &100_0000000i128);
    client.add_employee(&emp2, &200_0000000i128);

    // Full roster = 300; fund exactly 300 and pay both
    mint(&env, &token_id, &client.address, 300_0000000i128);
    assert_eq!(client.pay_salaries(), 2);
    assert_eq!(client.get_unpaid_payroll(), 0);

    // Add a late employee who is unpaid for this cycle; only they need funding
    let emp3 = Address::generate(&env);
    client.add_employee(&emp3, &50_0000000i128);
    assert_eq!(client.get_total_payroll(), 350_0000000i128);
    assert_eq!(client.get_unpaid_payroll(), 50_0000000i128);

    // Balance is 0; full-roster check would wrongly demand 350.
    // Unpaid-only check correctly requires 50.
    mint(&env, &token_id, &client.address, 50_0000000i128);
    assert_eq!(client.pay_salaries(), 1);
    assert_eq!(token_balance(&env, &token_id, &emp3), 50_0000000i128);
}

#[test]
fn test_pause_blocks_pay_and_allows_unpause() {
    let (env, admin, token_id, client) = setup_test_env();
    client.initialize(&admin, &token_id);

    let emp1 = Address::generate(&env);
    client.add_employee(&emp1, &100_0000000i128);
    mint(&env, &token_id, &client.address, 100_0000000i128);

    client.set_paused(&true);
    assert!(client.is_paused());

    assert_eq!(
        client.try_pay_salaries(),
        Err(Ok(PayrollError::ContractPaused))
    );
    assert_eq!(
        client.try_add_employee(&Address::generate(&env), &10i128),
        Err(Ok(PayrollError::ContractPaused))
    );
    assert_eq!(
        client.try_withdraw(&admin, &1i128),
        Err(Ok(PayrollError::ContractPaused))
    );

    // Emergency remove still works while paused
    client.remove_employee(&emp1);

    client.set_paused(&false);
    assert!(!client.is_paused());

    // Re-add and pay after unpause
    client.add_employee(&emp1, &100_0000000i128);
    assert_eq!(client.pay_salaries(), 1);
}

#[test]
fn test_transfer_admin_moves_control() {
    let (env, admin, token_id, client) = setup_test_env();
    client.initialize(&admin, &token_id);

    let new_admin = Address::generate(&env);
    client.transfer_admin(&new_admin);
    assert_eq!(client.get_admin(), new_admin);
}

#[test]
fn test_max_employees_enforced() {
    let (env, admin, token_id, client) = setup_test_env();
    client.initialize(&admin, &token_id);

    for _ in 0..50 {
        let emp = Address::generate(&env);
        client.add_employee(&emp, &1i128);
    }

    let overflow = Address::generate(&env);
    let result = client.try_add_employee(&overflow, &1i128);
    assert_eq!(result, Err(Ok(PayrollError::MaxEmployeesReached)));
}

#[test]
fn test_set_employee_active_false_excludes_from_payroll() {
    let (env, admin, token_id, client) = setup_test_env();
    client.initialize(&admin, &token_id);

    let emp1 = Address::generate(&env);
    let emp2 = Address::generate(&env);
    client.add_employee(&emp1, &100_0000000i128);
    client.add_employee(&emp2, &200_0000000i128);

    client.set_employee_active(&emp2, &false);
    assert!(!client.get_employee(&emp2).active);
    assert_eq!(client.get_total_payroll(), 100_0000000i128);
    assert_eq!(client.get_unpaid_payroll(), 100_0000000i128);

    mint(&env, &token_id, &client.address, 100_0000000i128);
    assert_eq!(client.pay_salaries(), 1);
    assert_eq!(token_balance(&env, &token_id, &emp1), 100_0000000i128);
    assert_eq!(token_balance(&env, &token_id, &emp2), 0);
}

#[test]
fn test_unauthorized_add_employee() {
    // No mock_all_auths — require_auth must fail for unauthenticated call
    let env = Env::default();
    let contract_id = env.register(PayrollContract, ());
    let client = PayrollContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let token_contract = env.register_stellar_asset_contract_v2(token_admin);
    let token_id = token_contract.address();

    // initialize itself requires auth; mock only for setup
    env.mock_all_auths();
    client.initialize(&admin, &token_id);

    // Clear auth mocks so subsequent calls are unauthenticated
    env.set_auths(&[]);

    let emp = Address::generate(&env);
    let result = client.try_add_employee(&emp, &100i128);
    assert!(result.is_err());
}

#[test]
fn test_unauthorized_pay_salaries() {
    let env = Env::default();
    let contract_id = env.register(PayrollContract, ());
    let client = PayrollContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let token_contract = env.register_stellar_asset_contract_v2(token_admin);
    let token_id = token_contract.address();

    env.mock_all_auths();
    client.initialize(&admin, &token_id);
    let emp = Address::generate(&env);
    client.add_employee(&emp, &100_0000000i128);
    mint(&env, &token_id, &client.address, 100_0000000i128);

    env.set_auths(&[]);
    let result = client.try_pay_salaries();
    assert!(result.is_err());
}

#[test]
fn test_unauthorized_withdraw() {
    let env = Env::default();
    let contract_id = env.register(PayrollContract, ());
    let client = PayrollContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let token_contract = env.register_stellar_asset_contract_v2(token_admin);
    let token_id = token_contract.address();

    env.mock_all_auths();
    client.initialize(&admin, &token_id);
    mint(&env, &token_id, &client.address, 100_0000000i128);

    env.set_auths(&[]);
    let result = client.try_withdraw(&admin, &10i128);
    assert!(result.is_err());
}
