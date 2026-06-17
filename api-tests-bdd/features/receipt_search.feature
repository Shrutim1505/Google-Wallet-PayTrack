# language: en
@receipts @search
Feature: Receipt Search
  As an authenticated user
  I want to search and filter my receipts
  So that I can find a specific transaction quickly

  Background:
    Given the API is reachable
    And the user is authenticated
    And the user has 5 seeded receipts across categories

  @smoke @happy
  Scenario: List receipts with default pagination
    When the user lists receipts
    Then the response status should be 200
    And the response should include pagination metadata
    And the response should contain at least 5 receipts

  @happy
  Scenario: Filter receipts by category
    When the user lists receipts filtered by category "Food"
    Then the response status should be 200
    And every returned receipt should have category "Food"

  @happy
  Scenario: Filter receipts by amount range
    When the user lists receipts with amount between 1 and 10000
    Then the response status should be 200
    And every returned receipt amount should be between 1 and 10000

  @happy
  Scenario: Search receipts by merchant prefix
    Given the user remembers the first seeded merchant
    When the user searches receipts using that merchant prefix
    Then the response status should be 200
    And the seeded receipt id should be present in the results

  @happy
  Scenario: Autocomplete merchant prefix
    Given the user remembers the first seeded merchant
    When the user requests merchant autocomplete using that prefix
    Then the response status should be 200
    And the response data should be a list
