# language: en
@auth @registration
Feature: User Registration
  As a new visitor to PayTrack
  I want to create an account
  So that I can manage my receipts securely

  Background:
    Given the API is reachable

  @smoke @happy
  Scenario: Register a new user with valid credentials
    Given a fresh registration payload
    When the user submits the registration request
    Then the response status should be 201
    And the response should contain a success envelope
    And the response should include a JWT access token
    And the response should include a refresh token
    And the user should be assigned the "user" role by default

  @negative
  Scenario Outline: Reject registration with invalid email
    Given a registration payload with email "<email>"
    When the user submits the registration request
    Then the response status should be 422
    And the response should report a validation error on field "email"

    Examples:
      | email                |
      |                      |
      | not-an-email         |
      | missing@dotcom       |
      | @no-local-part.com   |

  @negative
  Scenario Outline: Reject registration with weak password
    Given a registration payload with password "<password>"
    When the user submits the registration request
    Then the response status should be 422
    And the response should report a validation error on field "password"

    Examples:
      | password |
      |          |
      | short    |
      | 1234567  |

  @negative
  Scenario: Re-registering an existing email returns conflict
    Given a registered user
    When the user submits the registration request with the same email
    Then the response status should be 409
    And the response code should be "CONFLICT"
