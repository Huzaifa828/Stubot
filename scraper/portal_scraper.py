from playwright.sync_api import sync_playwright
import time
import json
import os
from dotenv import load_dotenv
load_dotenv()
print(f"roll: {os.getenv('stu_id')}")
print(f"pas: {os.getenv('pass')}")
url='https://edusmartz.ssuet.edu.pk/StudentPortal/Login'
student_roll=os.getenv('stu_id','Your-Student-ID')
Password=os.getenv('pass','Your-Password-Here')

def login_and_scrape(regno:str,password:str) -> dict:

    with sync_playwright() as p:
        browser=p.chromium.launch(headless=False)
        page=browser.new_page()

        page.goto(url)
        page.wait_for_load_state('networkidle')

        page.fill('[name="txtRegistrationNo_cs"]',regno)
        page.fill('[name="txtPassword_m6cs"]',password)
        page.press('[name="txtPassword_m6cs"]','Enter')
        page.wait_for_load_state('networkidle')

        time.sleep(10)
        login_page_content=page.is_visible('[name="txtPassword_m6cs"]')

        if login_page_content:
            browser.close()
            return {'error':'Login Failed'}

        current_url=page.url
        print(current_url)
        title=page.title()
        content=page.content()

        with open('Dashboard.html','w',encoding='utf-8') as f:
            f.write(content)

        links=page.query_selector_all('a')
        for link in links:
            href=link.get_attribute('href')
            text=link.inner_text().strip()
            if href and text:
                print(f' {text}: {href} ')

        time.sleep(5)
        try:
            modal=page.locator('#exampleModal')
            if modal.is_visible(timeout=5000):
                print('modal detected')
            page_popup=modal.locator("button:has-text('close'), [data-dismiss='modal'], .close")
            if page_popup.is_visible(timeout=2000):    
                page_popup.click()
                page.wait_for_timeout(1000)
                time.sleep(2)
        except Exception as e:
            print(f"Could not dismiss popup or it didn't appear: {e}")
            
        
        page.get_by_role("link",name='Exam',exact=False).click()
        page.wait_for_load_state('networkidle')
        page.get_by_role("link",name='Assessment Result',exact=False).click()
        page.wait_for_load_state('networkidle')
        print(page.url)
        page.wait_for_load_state('domcontentloaded')
        time.sleep(3)

        session_dropdown = page.locator('select[id*="ctl00_ContentPlaceHolder1_cmbSession_grp1_ct"]')
        page.wait_for_load_state('domcontentloaded')
        time.sleep(3)
        print("Looking for session dropdown...")
        session_dropdown.wait_for(state='visible', timeout=15000)
        session_dropdown.select_option(index=1)
        page.wait_for_load_state('networkidle')
        time.sleep(5)
        print(f'ooo {session_dropdown.inner_text()}')

        marks=[]
        for i in range (1,2):
            courses=page.query_selector_all('Course[Id*="ctl00_ContentPlaceHolder1_cmbCourse"]')
            print('i loop enterd')
            page.select_option('[Id*="ctl00_ContentPlaceHolder1_cmbCourse"]',index=i)
            page.wait_for_load_state('networkidle')
            print('abc',courses)
            table=page.query_selector('table[Id*="ctl00_ContentPlaceHolder1_TgridAssesmentDetail_ctl00__2__0"]')
            if table:
                
                rows=table.query_selector_all('tr.rgRow','tr.rgAltRow')
                for row in rows:
                    cells=row.query_selector_all('td')
                    marks.append({

                'assessment_type': cells[1].inner_text().strip(),
                'assessment_name': cells[2].inner_text().strip(),
                'course':          cells[3].inner_text().strip(),
                'section':         cells[4].inner_text().strip(),
                'teacher':         cells[5].inner_text().strip(),
                'total_marks':     cells[6].inner_text().strip(),
                'passing_marks':   cells[7].inner_text().strip(),
                'obtained_marks':  cells[8].inner_text().strip(),
                    })
            time.sleep(2)
            index=2
            for j in range(index,len(courses)+2):
                page.select_option('[Id*="ctl00_ContentPlaceHolder1_cmbCourse"]',index=j)
                page.wait_for_load_state('networkidle')
                time.sleep(2)            
                table=page.query_selector('table[Id*="ctl00_ContentPlaceHolder1_TgridAssesmentDetail_ctl00__2__0"]')
                if not table:
                    continue
                rows=table.query_selector_all('tr.rgRow','tr.rgAltRow')
                for row in rows:
                    cells=row.query_selector_all('td')
                    marks.append({

                'assessment_type': cells[1].inner_text().strip(),
                'assessment_name': cells[2].inner_text().strip(),
                'course':          cells[3].inner_text().strip(),
                'section':         cells[4].inner_text().strip(),
                'teacher':         cells[5].inner_text().strip(),
                'total_marks':     cells[6].inner_text().strip(),
                'passing_marks':   cells[7].inner_text().strip(),
                'obtained_marks':  cells[8].inner_text().strip(),
                    })
                    time.sleep(2)
                    index+=1
                    for mark in marks:
                        print(mark)
        browser.close()
        return marks

if __name__=='__main__':
    login_and_scrape(student_roll,Password)