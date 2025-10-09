from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Patient Dashboard
    page.goto("http://127.0.0.1:8080/patient-dashboard")
    page.wait_for_selector("text=My Documents")
    page.screenshot(path="jules-scratch/verification/patient_dashboard.png")

    # Doctor Dashboard
    page.goto("http://127.0.0.1:8080/doctor-dashboard")
    page.wait_for_selector("text=My Patients")
    page.screenshot(path="jules-scratch/verification/doctor_dashboard.png")

    # Hospital Staff Dashboard
    page.goto("http://127.0.0.1:8080/hospital-dashboard")
    page.wait_for_selector("text=Add Patient")
    page.screenshot(path="jules-scratch/verification/hospital_dashboard.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)