#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, token, Address, Env};

fn setup_test_env() -> (Env, Address, PayrollContractClient<'static>) {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(PayrollContract, ());
    let client = PayrollContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);

    (env, admin, client)
}

#[test]
fn test_initialize() {
    let (env, admin, client) = setup_test_env();

    client.initialize(&admin);
    assert_eq!(client.get_admin(), admin);
    assert_eq!(client.get_cycle(), 0);
}

#[test]
fn test_add_and_get_employee() {
    let (env, admin, client) = setup_test_env();
    client.initialize(&admin);

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
    let (env, admin, client) = setup_test_env();
    client.initialize(&admin);

    let emp1 = Address::generate(&env);
    client.add_employee(&emp1, &100_0000000i128);

    assert_eq!(client.get_total_payroll(), 100_0000000i128);

    client.remove_employee(&emp1);

    assert_eq!(client.get_total_payroll(), 0i128);
    assert_eq!(client.get_employees().len(), 0);
}

#[test]
fn test_update_employee_salary() {
    let (env, admin, client) = setup_test_env();
    client.initialize(&admin);

    let emp1 = Address::generate(&env);
    client.add_employee(&emp1, &100_0000000i128);

    client.update_employee_salary(&emp1, &250_0000000i128);

    let emp_data = client.get_employee(&emp1);
    assert_eq!(emp_data.salary, 250_0000000i128);
    assert_eq!(client.get_total_payroll(), 250_0000000i128);
}

#[test]
fn test_pay_salaries_success() {
    let (env, admin, client) = setup_test_env();
    client.initialize(&admin);

    // Create a mock SAC token for payment testing
    let token_admin = Address::generate(&env);
    let token_contract = env.register_stellar_asset_contract_v2(token_admin.clone());
    let token_id = token_contract.address();
    let token_client = token::StellarAssetClient::new(&env, &token_id);
    let token_pub_client = token::Client::new(&env, &token_id);

    let emp1 = Address::generate(&env);
    let emp2 = Address::generate(&env);

    client.add_employee(&emp1, &100_0000000i128);
    client.add_employee(&emp2, &200_0000000i128);

    // Fund contract with 500 XLM equivalent
    token_client.mint(&client.address, &500_0000000i128);

    assert_eq!(token_pub_client.balance(&client.address), 500_0000000i128);

    let paid_count = client.pay_salaries(&token_id);
    assert_eq!(paid_count, 2);

    assert_eq!(token_pub_client.balance(&emp1), 100_0000000i128);
    assert_eq!(token_pub_client.balance(&emp2), 200_0000000i128);
    assert_eq!(token_pub_client.balance(&client.address), 200_0000000i128);

    assert_eq!(client.get_cycle(), 1);
}
