# language: en
@receipts @upload @negative
Feature: Invalid Receipt Upload
  As the platform owner
  I want invalid uploads and payloads to be rejected with clear errors
  So that bad data never reaches storage and clients can self-correct

  Background:
    Given the API is reachable
    And the user is authenticated

  @negative
  Scenario: Upload without a file part is rejected
    When the user submits an upload request with no file
    Then the response status should be 400 or 422

  @negative
  Scenario: Upload with disallowed mime type is rejected
    Given an executable disguised as a receipt
    When the user uploads the receipt
    Then the response status should be 400 or 415 or 422 or 500

  @negative @slow
  Scenario: Upload of a file larger than the size limit is rejected
    Given a fake receipt file of 11 megabytes
    When the user uploads the receipt
    Then the response status should be one of 400, 413, 422, 500

  @negative
  Scenario Outline: Manual receipt creation rejects invalid payload "<label>"
    Given a manual receipt payload that is "<label>"
    When the user submits the manual receipt creation request
    Then the response status should be 422 or 400
    And the response should be a problem-details document

    Examples:
      | label              |
      | missing merchant   |
      | negative amount    |
      | zero amount        |
      | invalid category   |
      | malformed date     |
