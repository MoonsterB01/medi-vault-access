from playwright.sync_api import sync_playwright, expect

def run_verification():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the patient dashboard
        page.goto("http://127.0.0.1:8080/patient-dashboard")

        # Wait for the page to load and the default "documents" tab to be visible
        expect(page.get_by_text("My Documents")).to_be_visible()

        # Click on the "Search" tab
        page.get_by_role("link", name="Search Documents").click()
        expect(page).to_have_url("http://127.0.0.1:8080/patient-dashboard#search")
        expect(page.get_by_text("Enhanced Document Search")).to_be_visible()

        # Click on the "Upload" tab
        page.get_by_role("link", name="Upload Documents").click()
        expect(page).to_have_url("http://127.0.0.1:8080/patient-dashboard#upload")
        expect(page.get_by_text("Upload a new document")).to_be_visible()

        # Click on the "Family Access" tab
        page.get_by_role("link", name="Family Access").click()
        expect(page).to_have_url("http://127.0.0.1:8080/patient-dashboard#family")
        expect(page.get_by_text("Manage Family Access")).to_be_visible()

        # Go back to the documents tab for the screenshot
        page.get_by_role("link", name="My Documents").click()
        expect(page).to_have_url("http://127.0.0.1:8080/patient-dashboard#documents")

        # Take a screenshot
        page.screenshot(path="jules-scratch/verification/verification.png")

        browser.close()

if __name__ == "__main__":
    run_verification()