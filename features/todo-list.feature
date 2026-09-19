# GEN_10 R1 — one file per capability, named after the capability, in features/.
# GEN_10 R2 — written in the language of the person who asked: no routes, no status
#             codes, no ids. Those live in the step definitions (BE_13 R2).
Feature: Keeping a todo list

  A person keeps lists of things they mean to do, ticks them off as they go,
  and archives a list once it no longer needs their attention.

  @api
  Scenario: Adding something to a new list
    Given I have a list called "Trip to Kyoto"
    When I add "Book flights" to that list
    Then the list shows 1 thing left to do
    And "Book flights" is still to do

  @api
  Scenario: Ticking something off
    Given I have a list called "Weekly chores"
    And that list contains "Wash the car"
    When I tick off "Wash the car"
    Then "Wash the car" is done
    And the list shows 0 things left to do

  @api
  Scenario: Changing my mind about something I ticked off
    Given I have a list called "Reading"
    And that list contains "Finish chapter 3"
    And I have ticked off "Finish chapter 3"
    When I put "Finish chapter 3" back on the list
    Then "Finish chapter 3" is still to do

  @api
  Scenario: Refusing two things with the same name on one list
    Given I have a list called "Shopping"
    And that list contains "Milk"
    When I try to add "milk" to that list
    Then I am told that the list already has something with that name

  @api
  Scenario: An archived list stops accepting changes
    Given I have a list called "Last year's plans"
    And I have archived that list
    When I try to add "One more thing" to that list
    Then I am told the list is archived and cannot be changed

  # GEN_10 R7 — the data varies in an Examples table rather than in copied scenarios.
  @api
  Scenario Outline: Only unfinished things count as left to do
    Given I have a list called "Counting <name>"
    And that list contains "<first>"
    And that list contains "<second>"
    When I tick off "<first>"
    Then the list shows 1 thing left to do

    Examples:
      | name     | first        | second        |
      | errands  | Post parcel  | Collect keys  |
      | cooking  | Buy onions   | Chop onions   |
