# language: en
@receipts @download
Feature: Receipt Download
  As an authenticated user
  I want to download my receipts
  So that I can keep records and submit expense claims

  Background:
    Given the API is reachable
    And the user is authenticated
    And the user has at least one receipt

  @smoke @happy
  Scenario: Retrieve a specific receipt by id
    When the user retrieves the receipt by id
    Then the response status should be 200
    And the response should match the receipt schema
    And the receipt id in the response should match the requested id

  @happy
  Scenario: Export receipts as JSON
    When the user exports receipts in "json" format
    Then the response status should be 200
    And the response should contain a success envelope

  @happy
  Scenario: Export receipts as CSV
    When the user exports receipts in "csv" format
    Then the response status should be 200
    And the response Content-Type should include "text/csv"
    And the CSV body should include the header "id,merchant,amount"

  @negative
  Scenario: Retrieving an unknown receipt id returns 404
    When the user retrieves a receipt with id "00000000-0000-0000-0000-000000000000"
    Then the response status should be 404
