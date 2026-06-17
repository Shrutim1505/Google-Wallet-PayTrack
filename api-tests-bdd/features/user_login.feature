# language: en
@auth @login
Feature: User Login
  As a registered user
  I want to log in to PayTrack
  So that I can access my receipts and budgets

  Background:
    Given the API is reachable
    And a registered user

  @smoke @happy
  Scenario: Login with correct credentials
    When the user logs in with valid credentials
    Then the response status should be 200
    And the response should include a JWT access token
    And the JWT should be signature-valid
    And the JWT subject should match the registered user

  @negative
  Scenario: Login with wrong password
    When the user logs in with an incorrect password
    Then the response status should be 401
    And the response code should be "UNAUTHORIZED"

  @negative
  Scenario: Login with unknown email
    When the user logs in with an unknown email
    Then the response status should be 401

  @negative
  Scenario: Login without a password
    When the user submits a login request without a password
    Then the response status should be 422
    And the response should report a validation error on field "password"
