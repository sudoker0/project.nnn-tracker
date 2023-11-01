const date = new Date()
const tzOffset = date.getTimezoneOffset()
const hours = Math.abs(Math.floor(tzOffset / 60))
const minutes = Math.abs(tzOffset % 60)

//? Get the timezone offset (ex: +07:00)
const tzStr = `${tzOffset >= 0 ? '-' : '+'}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`

//? Map the timezone offset to timezone string
const tzMap = {
    "+00:00": "Zulu",
    "+03:00": "W-SU",
    "+01:00": "Poland",
    "+02:00": "Libya",
    "-09:00": "US/Aleutian",
    "-08:00": "US/Alaska",
    "-04:00": "US/Michigan",
    "-03:00": "Etc/GMT+3",
    "-05:00": "US/Indiana-Starke",
    "-06:00": "US/Mountain",
    "-07:00": "US/Pacific",
    "-02:00": "Etc/GMT+2",
    "-01:00": "Etc/GMT+1",
    "-03:30": "Canada/Newfoundland",
    "+11:00": "Pacific/Ponape",
    "+07:00": "Indian/Christmas",
    "+10:00": "Pacific/Yap",
    "+05:00": "Indian/Maldives",
    "+13:00": "Pacific/Tongatapu",
    "+06:00": "Indian/Chagos",
    "+12:00": "Pacific/Wallis",
    "+04:00": "Indian/Reunion",
    "+08:00": "Singapore",
    "+05:30": "Asia/Kolkata",
    "+09:00": "ROK",
    "+04:30": "Asia/Kabul",
    "+05:45": "Asia/Katmandu",
    "+06:30": "Indian/Cocos",
    "+03:30": "Iran",
    "+10:30": "Australia/Yancowinna",
    "+09:30": "Australia/North",
    "+08:45": "Australia/Eucla",
    "-10:00": "US/Hawaii",
    "-11:00": "US/Samoa",
    "-12:00": "Etc/GMT+12",
    "+14:00": "Pacific/Kiritimati",
    "+13:45": "Pacific/Chatham",
    "-10:30": "Pacific/Marquesas"
}

//? For time synchronization
const timeServer = "https://worldtimeapi.org/api/timezone"

interface Template {
    [key: string]: string
}

interface HTMLElement {
    replace(data: Template, prefix?: string): void
}

// ! everything was a pain to handle
HTMLElement.prototype.replace = function (data: Template, prefix: string = "$_") {
    const alternate_prefix = "id_dlr_";
    const _this: () => HTMLElement = () => this;
    for (const i in data) {
        const old = _this().innerHTML;
        const span: () => HTMLElement | null = () =>
            _this().querySelector(`span.reactive#${alternate_prefix}${encodeURIComponent(i)}`)
        if (span() == null) _this().innerHTML =
            old.replace(`${prefix}${i}`, `
                <span class="reactive" id="${alternate_prefix}${encodeURIComponent(i)}"></span>`)
        span().innerText = data[i]
    }
}

function qSel<T extends HTMLElement>(selector: string): T {
    return document.querySelector(selector)
}

function displayTime(date: number) {
    var s = Math.floor(date / 1000),
        m = Math.floor(s / 60),
        h = Math.floor(m / 60),
        d = Math.floor(h / 24)

    var result = "", result_arr = [
        `${d} days`,
        `${h % 24} hours`,
        `${m % 60} minutes`,
        `${s % 60} seconds`,
    ]

    result_arr = result_arr.filter(x => {
        return x.replace(/(\d+) (\w)*?$/gm, (_0, p1, _p2) => {
            const num = Number(p1)
            if (num == 0) return ""
            return x
        }) != ""
    })

    result = result_arr.slice(0, result_arr.length - 1).join(", ")
        + ((result_arr.length > 1) ? " and " : "")
        + result_arr[result_arr.length - 1]

    return {
        result: result,
        d: d,
        h: h % 24,
        m: m % 60,
        s: s % 60,
    }
}

function checkNovemberStatus() {
    const now = new Date()
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()
    var timeMilestone: Date
    var timeStat: "before" | "during" | "after"

    if (currentMonth < 11) { //? How much more time before the start of November
        timeMilestone = new Date(currentYear, 10, 1)
        timeStat = "before"
    } else if (currentMonth == 11) { //? How much more time before the end of November
        timeMilestone = new Date(currentYear, 11, 1)
        timeStat = "during"
    } else {//? How much more time before the start of November (next year)
        timeMilestone = new Date(currentYear + 1, 10, 1)
        timeStat = "after"
    }

    const diff = timeMilestone.getTime() - now.getTime()
    return {
        stat: timeStat,
        diff: diff
    }
}

async function getTimeFromAPI() {
    var out = {
        status: true,
        content: {}
    }
    try {
        const req = await fetch(`${timeServer}/${tzMap[tzStr]}`)
        const res = await req.json()

        const tzString: string = res["datetime"]
        out.content = new Date(tzString)
    } catch (e) {
        out.status = false
        out.content = "Unable to connect to the WorldTimeAPI, or an invalid response is provided.\n" +
            "Please file an Issue on the GitHub page for this project.\n" +
            `Details: ${e}`
    }

    return out
}

function updateTime() {
    const status = checkNovemberStatus()
    const displayString = displayTime(status.diff)

    qSel("#clock").replace({
        "days": displayString.d.toString().padStart(3, "0"),
        "hours": displayString.h.toString().padStart(2, "0"),
        "minutes": displayString.m.toString().padStart(2, "0"),
        "seconds": displayString.s.toString().padStart(2, "0"),
    })

    document.querySelectorAll(".status_str").forEach(v => v.classList.add("hidden"))
    qSel(`.status_str.status_1[data-status="${status.stat}"]`).classList.remove("hidden")
    qSel(`.status_str.status_2[data-status="${status.stat}"]`).classList.remove("hidden")

    requestAnimationFrame(updateTime)
}

function mainErrorReporting(content: string) {
    qSel("#main_error").replace({
        "error_content": content
    })
    qSel("#main_error").classList.remove("hidden")
    qSel("#main").classList.add("hidden")

    throw new Error()
}

var updateTimeOffsetInterval = null
async function updateTimeOffset() {
    const data = await getTimeFromAPI()
    if (data.status) {
        const diff = ((new Date()).getTime() - (new Date(data.content as string)).getTime()) / 1000

        if (diff > 10) {
            mainErrorReporting(`Incorrect time reported by the browser (time difference was reported to be ${diff} seconds). Please re-sync your system clock, or change the system clock manually to the correct time, then reload the page.`)
            return
        }

        qSel("#info_display").replace({
            "time_offset": diff.toString(),
            "timezone": tzStr
        })
    } else {
        mainErrorReporting(data.content as string)
        return
    }
}

(async () => {
    updateTimeOffsetInterval = setInterval(updateTimeOffset, 20000)
    await updateTimeOffset()
    requestAnimationFrame(updateTime)
})()