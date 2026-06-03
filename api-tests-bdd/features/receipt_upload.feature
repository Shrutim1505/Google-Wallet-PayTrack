# language: en
@receipts @upload
Feature: Receipt Upload
  As an authenticated user
  I want to upload images of my receipts
  So that the system extracts and stores them automatically

  Background:
    Given the API is reachable
    And the user is authenticated

  @smoke @happy
  Scenario: Upload a valid PNG receipt
    Given a sample PNG receipt file
    When the user uploads the receipt
    Then the response status should be 201
    And the response should contain a success envelope
    And the receipt should be persisted in the database

  @happy
  Scenario: Upload a valid PDF receipt
    Given a sample PDF receipt file
    When the user uploads the receipt
    Then the response status should be 201

  @happy
  Scenario: Upload with explicit category override
    Given a sample PNG receipt file
    When the user uploads the receipt with category "Bills"
    Then the response status should be 201
    And the receipt category in the response should be "Bills"
