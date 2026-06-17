# =============================================================================
#  Behave BDD runner — Google-Wallet-PayTrack
# =============================================================================

PYTHON      ?= python3
VENV        ?= .venv
ACTIVATE    := . $(VENV)/bin/activate &&
BEHAVE      := $(ACTIVATE) behave
ALLURE      ?= allure

.DEFAULT_GOAL := help
.PHONY: help install venv smoke regression auth receipts security \
        registration login upload search download invalid unauthorized \
        dry-run clean report report-static lint check

help:                ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
	  awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

# ---------- Environment ------------------------------------------------------

venv:                ## Create the venv if missing
	@test -d $(VENV) || $(PYTHON) -m venv $(VENV)

install: venv        ## Install BDD + framework dependencies
	$(ACTIVATE) pip install --upgrade pip
	$(ACTIVATE) pip install -r requirements.txt

# ---------- Run by tag -------------------------------------------------------

smoke:               ## Smoke scenarios (@smoke)
	$(BEHAVE) -t @smoke

regression:          ## Full regression sweep
	$(BEHAVE)

auth:                ## All auth scenarios
	$(BEHAVE) -t @auth

receipts:            ## All receipt scenarios
	$(BEHAVE) -t @receipts

security:            ## Security/unauthorized/JWT scenarios
	$(BEHAVE) -t @security

# ---------- Run by feature ---------------------------------------------------

registration:        ## User registration feature
	$(BEHAVE) features/user_registration.feature

login:               ## User login feature
	$(BEHAVE) features/user_login.feature

upload:              ## Receipt upload feature
	$(BEHAVE) features/receipt_upload.feature

search:              ## Receipt search feature
	$(BEHAVE) features/receipt_search.feature

download:            ## Receipt download feature
	$(BEHAVE) features/receipt_download.feature

invalid:             ## Invalid upload scenarios
	$(BEHAVE) features/invalid_receipt_upload.feature

unauthorized:        ## Unauthorized access scenarios
	$(BEHAVE) features/unauthorized_access.feature

# ---------- Validation -------------------------------------------------------

dry-run:             ## Parse all features without executing
	$(BEHAVE) --dry-run --no-summary

check:               ## Compile-check all step modules
	$(ACTIVATE) python -m compileall -q features support

# ---------- Reporting --------------------------------------------------------

report:              ## Open Allure live report
	$(ALLURE) serve reports/allure-results

report-static:       ## Generate static Allure HTML
	$(ALLURE) generate reports/allure-results -o reports/allure-report --clean
	@echo "Open reports/allure-report/index.html"

# ---------- Maintenance ------------------------------------------------------

clean:               ## Remove reports / caches / pyc
	rm -rf reports/allure-results reports/allure-report reports/junit reports/*.txt
	find . -type d -name "__pycache__" -prune -exec rm -rf {} +
