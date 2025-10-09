from playwright.sync_api import sync_playwright

def run_verification():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("http://127.0.0.1:8080/patient-dashboard")
        # Wait for a few seconds to let the page attempt to load data
        page.wait_for_timeout(5000)
        page.screenshot(path="jules-scratch/verification/debug_screenshot.png")
        browser.close()

if __name__ == "__main__":
    run_verification()