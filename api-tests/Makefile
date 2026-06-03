# =============================================================================
#  Google-Wallet-PayTrack | API Test Runner
#
#  Usage:
#    make install            # set up venv and install deps
#    make smoke              # run smoke tests
#    make regression         # run full regression
#    make parallel           # run regression in parallel (auto-detect cores)
#    make rbac               # only RBAC suite
#    make report             # serve the Allure HTML report
#    make clean              # wipe reports and __pycache__
# =============================================================================

PYTHON      ?= python3
VENV        ?= .venv
ACTIVATE    := . $(VENV)/bin/activate &&
PYTEST      := $(ACTIVATE) pytest
ALLURE      ?= allure
WORKERS     ?= auto
RERUNS      ?= 1

.DEFAULT_GOAL := help
.PHONY: help install venv clean smoke regression sanity parallel \
        auth receipts rbac jwt db health e2e \
        report report-static lint check

help:                 ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
	  awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

# ---------- Environment ------------------------------------------------------

venv:                 ## Create a Python virtualenv if it doesn't exist
	@test -d $(VENV) || $(PYTHON) -m venv $(VENV)

install: venv         ## Install all dependencies into the venv
	$(ACTIVATE) pip install --upgrade pip
	$(ACTIVATE) pip install -r requirements.txt

# ---------- Test runs --------------------------------------------------------

smoke:                ## Smoke tests only (-m smoke)
	$(PYTEST) -m smoke -v

sanity:               ## Sanity subset (-m sanity)
	$(PYTEST) -m sanity -v

regression:           ## Full regression suite (-m regression or all)
	$(PYTEST) -v --reruns=$(RERUNS) --reruns-delay=2

parallel:             ## Full suite in parallel (configurable WORKERS=auto|N)
	$(PYTEST) -n $(WORKERS) --dist=loadfile --reruns=$(RERUNS) --reruns-delay=2

auth:                 ## Auth domain
	$(PYTEST) -m auth -v

receipts:             ## Receipts domain
	$(PYTEST) -m receipts -v

rbac:                 ## RBAC domain
	$(PYTEST) -m rbac -v

jwt:                  ## JWT-security domain
	$(PYTEST) -m jwt -v

db:                   ## Database-validation suite
	$(PYTEST) -m db -v

health:               ## Health-check suite
	$(PYTEST) -m health -v

e2e:                  ## End-to-end journeys
	$(PYTEST) -m e2e -v

# ---------- Reporting --------------------------------------------------------

report:               ## Open the Allure live report (requires `allure` CLI)
	$(ALLURE) serve reports/allure-results

report-static:        ## Generate static Allure HTML in reports/allure-report
	$(ALLURE) generate reports/allure-results -o reports/allure-report --clean
	@echo "Open reports/allure-report/index.html"

# ---------- Maintenance ------------------------------------------------------

clean:                ## Remove reports, logs, caches
	rm -rf reports/allure-results reports/allure-report reports/html logs/*.log
	find . -type d -name "__pycache__" -prune -exec rm -rf {} +
	find . -type d -name ".pytest_cache" -prune -exec rm -rf {} +

lint:                 ## Compile-check every Python file
	$(ACTIVATE) python -m compileall -q framework tests config conftest.py

check:                ## Validate test collection without executing
	$(PYTEST) --collect-only -q
