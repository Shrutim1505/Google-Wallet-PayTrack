# language: en
@security @unauthorized
Feature: Unauthorized Access
  As the platform owner
  I want every protected endpoint to reject anonymous and forged requests
  So that user data is never exposed without proper authentication

  Background:
    Given the API is reachable

  @smoke @negative
  Scenario: Anonymous create receipt returns 401
    Given an anonymous (unauthenticated) client
    When the client tries to create a receipt
    Then the response status should be 401
    And the response code should be "UNAUTHORIZED"

  @negative
  Scenario: Anonymous list receipts returns 401
    Given an anonymous (unauthenticated) client
    When the client tries to list receipts
    Then the response status should be 401

  @negative
  Scenario: Anonymous receipt upload returns 401
    Given an anonymous (unauthenticated) client
    And a sample PNG receipt file
    When the anonymous client tries to upload the receipt
    Then the response status should be 401

  @negative @jwt
  Scenario: Expired JWT is rejected
    Given a JWT that is already expired
    When the client calls the verify endpoint with that token
    Then the response status should be 401

  @negative @jwt
  Scenario: Forged JWT (wrong secret) is rejected
    Given a JWT signed with the wrong secret
    When the client calls the verify endpoint with that token
    Then the response status should be 401

  @negative @jwt
  Scenario: Tampered JWT payload is rejected
    Given a registered user
    And a tampered version of the user's JWT
    When the client calls the verify endpoint with that token
    Then the response status should be 401

  @negative @rbac
  Scenario: Viewer role cannot create receipts
    Given a user with the viewer role
    When the viewer tries to create a receipt
    Then the response status should be 403
    And the response code should be "FORBIDDEN"
