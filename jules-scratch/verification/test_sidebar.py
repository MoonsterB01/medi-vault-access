import re
from playwright.sync_api import Page, expect, sync_playwright

def test_patient_sidebar(page: Page):
    page.goto("http://127.0.0.1:8080/patient-dashboard")
    expect(page.get_by_role("link", name="My Documents")).to_be_visible()
    expect(page.get_by_role("link", name="Search Documents")).to_be_visible()
    expect(page.get_by_role("link", name="My Appointments")).to_be_visible()
    expect(page.get_by_role("link", name="Book Appointment")).to_be_visible()
    expect(page.get_by_role("link", name="Upload Documents")).to_be_visible()
    expect(page.get_by_role("link", name="Family Access")).to_be_visible()

def test_doctor_sidebar(page: Page):
    page.goto("http://127.0.0.1:8080/doctor-dashboard")
    expect(page.get_by_role("link", name="Dashboard")).to_be_visible()
    expect(page.get_by_role("link", name="My Patients")).to_be_visible()
    expect(page.get_by_role("link", name="Appointments")).to_be_visible()

def test_hospital_staff_sidebar(page: Page):
    page.goto("http://127.0.0.1:8080/hospital-dashboard")
    expect(page.get_by_role("link", name="Dashboard")).to_be_visible()
    expect(page.get_by_role("link", name="Patients")).to_be_visible()
    expect(page.get_by_role("link", name="Add Patient")).to_be_visible()
    expect(page.get_by_role("link", name="Doctors")).to_be_visible()
    expect(page.get_by_role("link", name=re.compile("Appointments"))).to_be_visible()
    expect(page.get_by_role("link", name="Add Record")).to_be_visible()

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    test_patient_sidebar(page)
    test_doctor_sidebar(page)
    test_hospital_staff_sidebar(page)
    browser.close()
    print("All sidebar tests passed!")