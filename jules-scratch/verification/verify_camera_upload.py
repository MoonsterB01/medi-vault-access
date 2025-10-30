from playwright.sync_api import sync_playwright
import time

def run(playwright):
    browser = playwright.chromium.launch()
    context = browser.new_context()
    page = context.new_page()

    try:
        time.sleep(5)
        page.goto("http://127.0.0.1:8080/upload")

        # Click the "Open Camera" button to open the DocumentScanner modal
        page.click('button:has-text("Open Camera")')

        # Wait for the modal to appear
        page.wait_for_selector('div[role="dialog"]')

        # Take a screenshot of the modal
        page.screenshot(path="jules-scratch/verification/verification.png")

        print("Screenshot taken successfully.")
    except Exception as e:
        print(f"An error occurred: {e}")
    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
