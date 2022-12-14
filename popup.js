var userId
document.addEventListener('DOMContentLoaded', async () => {
    const clockInBtn = document.getElementById("clockIn")
    const clockOutBtn = document.getElementById("clockOut")
    try {
        if(!localStorage.getItem('user_id')){
            localStorage.setItem('user_id', Date.now())
            userId = localStorage.getItem('user_id')
        }

        // Get the current tab
        const tabs = await chrome.tabs.query({});
        const tab = tabs.find(tab => tab.url.includes("calibraint.keka"))

        if(tab){    
            // Execute script in the current tab
            await chrome.scripting.executeScript({
                target: {
                    tabId: tab.id,
                    allFrames: true
                },
                func: getAccessToken,
                args: ["clockIn", "clockOut"]
            })
    
            clockInBtn.addEventListener('click', () => {
                clockIn(clockInBtn, clockOutBtn)
            })
    
            clockOutBtn.addEventListener('click', () => {
                clockOut(clockInBtn, clockOutBtn)
            })
        }
        else {
            const accessToken = localStorage.getItem('keka')
            await checkClockInStatus(accessToken)
        }
    } 
    catch(err) {
        console.log(err)
    }
});

chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        const { accessToken, clockInBtnId, clockOutBtnId } = request
        checkClockInStatus(accessToken, clockInBtnId, clockOutBtnId)
    }
);

async function addUser(accessToken) {
    await postData('http://localhost:3000/add-user', { id: userId, accessToken })
}

function checkClockInStatus(accessToken, clockInBtnId = 'clockIn', clockOutBtnId = 'clockOut') {
    localStorage.setItem('keka', accessToken)
    const clockInBtn = document.getElementById(clockInBtnId)
    const clockOutBtn = document.getElementById(clockOutBtnId)
    fetch(
        'https://calibraint.keka.com/k/dashboard/api/mytime/attendance/attendancedayrequests', 
        {
            method: "GET",
            headers: {
                'authorization': accessToken
            }
        })
        .then(res => res.json())
        .then(res => {
            if(
                res.webclockinLastEntry !== null 
                && 
                res.webclockinLastEntry.punchStatus === 0
                ){
                document.getElementById("clocked-in-status").innerHTML = `Clocked In`
                clockOutBtn.style.display = "block"
                clockInBtn.style.display = "none"
            }
            else{
                document.getElementById("clocked-in-status").innerHTML = `Clocked Out`
                clockInBtn.style.display = "block"
                clockOutBtn.style.display = "none"
            }true
        })
        .catch(err => {
            document.getElementById("clocked-in-status").innerHTML = `Open Keka once and login`
            clockInBtn.style.display = "none"
            clockOutBtn.style.display = "none"
        })
}

const webClockInUrl = 'https://calibraint.keka.com/k/dashboard/api/mytime/attendance/webclockin'

async function clockIn(clockInBtn, clockOutBtn) {
    clockOutBtn.style.display = "block"
    clockInBtn.style.display = "none"
    await postData(webClockInUrl, clockInOutPayload('clockIn'))
}

async function clockOut(clockInBtn, clockOutBtn) {
    clockInBtn.style.display = "block"
    clockOutBtn.style.display = "none"
    await postData(webClockInUrl, clockInOutPayload('clockOut'))
}

async function getAccessToken(clockInBtnId, clockOutBtnId) {
    accessToken = `Bearer ${localStorage.getItem('access_token')}`

    await chrome.runtime.sendMessage({
        accessToken, 
        clockInBtnId, 
        clockOutBtnId
    });
}

async function postData(url = '', data = {}) {
    const response = await fetch(
        url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'authorization': localStorage.getItem('keka')
        },
        body: JSON.stringify(data)
    })

    return response
}

function clockInOutPayload(punchStatus) {
    return {
            "timestamp": new Date().toISOString(),
            "attendanceLogSource": 1,
            "locationAddress": null,
            "manualClockinType": 1,
            "note": "",
            "originalPunchStatus": punchStatus === 'clockIn' ? 0 : 1
        }
}