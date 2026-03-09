"use client"

import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  GraduationCap, 
  Calculator, 
  Calendar, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  Clock,
  BookOpen,
  ChevronDown
} from "lucide-react"

// Configuration
const BASE_HOURS = 149 // As of 09.03.2026
const BASE_DATE = new Date(2026, 2, 9) // March 9, 2026
const END_DATE = new Date(2026, 5, 26) // June 26, 2026
const SCHEDULE = [6, 7, 7, 6, 6] // Mon-Fri hours

// Subject base hours as of 09.03.2026
const SUBJECT_BASE_HOURS: Record<string, number> = {
  "biologia": 5,
  "chemia": 4,
  "fizyka": 8,
  "geografia": 4,
  "godzina wychowawcza": 5,
  "historia rozszerzona": 23,
  "informatyka": 4,
  "angielski": 27,
  "polski": 19,
  "jezyk 2gi": 10,
  "matematyka": 18,
  "religia": 9,
  "wf": 8,
}

// Weekly schedule per subject (which days have this subject)
// 0 = Monday, 1 = Tuesday, 2 = Wednesday, 3 = Thursday, 4 = Friday
const SUBJECT_SCHEDULE: Record<string, { day: number; count: number }[]> = {
  "biologia": [{ day: 3, count: 1 }],
  "chemia": [{ day: 2, count: 1 }],
  "fizyka": [{ day: 1, count: 1 }, { day: 3, count: 1 }],
  "geografia": [{ day: 4, count: 1 }],
  "godzina wychowawcza": [{ day: 4, count: 1 }],
  "historia rozszerzona": [{ day: 0, count: 1 }, { day: 1, count: 2 }, { day: 2, count: 2 }, { day: 3, count: 1 }],
  "informatyka": [{ day: 4, count: 1 }],
  "angielski": [{ day: 0, count: 1 }, { day: 1, count: 2 }, { day: 2, count: 1 }, { day: 3, count: 2 }],
  "polski": [{ day: 0, count: 1 }, { day: 2, count: 2 }, { day: 4, count: 1 }],
  "jezyk 2gi": [{ day: 0, count: 1 }, { day: 2, count: 1 }],
  "matematyka": [{ day: 0, count: 2 }, { day: 3, count: 1 }],
  "religia": [{ day: 1, count: 1 }, { day: 4, count: 1 }],
  "wf": [{ day: 4, count: 1 }],
}

const SUBJECT_NAMES: Record<string, string> = {
  "biologia": "Biologia",
  "chemia": "Chemia",
  "fizyka": "Fizyka",
  "geografia": "Geografia",
  "godzina wychowawcza": "Godzina wychowawcza",
  "historia rozszerzona": "Historia rozszerzona",
  "informatyka": "Informatyka",
  "angielski": "Język angielski",
  "polski": "Język polski",
  "jezyk 2gi": "Drugi język obcy",
  "matematyka": "Matematyka",
  "religia": "Religia",
  "wf": "Wychowanie fizyczne",
}

const HOLIDAYS = new Set([
  "2026-04-02",
  "2026-04-03",
  "2026-04-06",
  "2026-04-07",
  "2026-05-01",
  "2026-05-04",
  "2026-05-05",
  "2026-05-06",
  "2026-06-04",
  "2026-06-05",
])

function formatDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function formatDatePL(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0")
  const month = String(date.getMonth() + 1).padStart(2, "0")
  return `${day}.${month}`
}

function formatDateFullPL(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0")
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const year = date.getFullYear()
  return `${day}.${month}.${year}`
}

function isWeekend(date: Date): boolean {
  const day = date.getDay()
  return day === 0 || day === 6
}

function isSchoolDay(date: Date): boolean {
  if (isWeekend(date)) return false
  if (HOLIDAYS.has(formatDateKey(date))) return false
  return true
}

function getHoursForDay(date: Date): number {
  const dayOfWeek = date.getDay()
  if (dayOfWeek === 0 || dayOfWeek === 6) return 0
  return SCHEDULE[dayOfWeek - 1]
}

function getSubjectHoursForDay(date: Date, subjectKey: string): number {
  const dayOfWeek = date.getDay()
  if (dayOfWeek === 0 || dayOfWeek === 6) return 0
  
  const schedule = SUBJECT_SCHEDULE[subjectKey]
  if (!schedule) return 0
  
  const dayIndex = dayOfWeek - 1 // Convert to 0=Monday
  const dayEntry = schedule.find(s => s.day === dayIndex)
  return dayEntry?.count || 0
}

interface CalculationResult {
  currentAttendance: number
  totalHours: number
  futureHours: number
  hoursToMakeUp: number
  daysNeeded: number
  targetDate: Date | null
  status: "success" | "recoverable" | "failed"
  totalHoursInSemester: number
}

interface SubjectCalculationResult extends CalculationResult {
  lessonsNeeded: number
}

function calculateAttendance(userAttendance: number, today: Date): CalculationResult {
  // Calculate hours from BASE_DATE+1 to today
  let hoursUntilToday = BASE_HOURS
  const currentDate = new Date(BASE_DATE)
  currentDate.setDate(currentDate.getDate() + 1) // Start from March 10

  while (currentDate <= today) {
    if (isSchoolDay(currentDate)) {
      hoursUntilToday += getHoursForDay(currentDate)
    }
    currentDate.setDate(currentDate.getDate() + 1)
  }

  // Calculate future hours from tomorrow to END_DATE
  let futureHours = 0
  const futureDays: { date: Date; hours: number }[] = []
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const futureDate = new Date(tomorrow)

  while (futureDate <= END_DATE) {
    if (isSchoolDay(futureDate)) {
      const hours = getHoursForDay(futureDate)
      futureHours += hours
      futureDays.push({ date: new Date(futureDate), hours })
    }
    futureDate.setDate(futureDate.getDate() + 1)
  }

  const totalHoursInSemester = hoursUntilToday + futureHours
  const requiredFor50Percent = Math.floor(totalHoursInSemester * 0.5) + 1 // >50%
  const currentAttendance = (userAttendance / hoursUntilToday) * 100
  const hoursNeeded = requiredFor50Percent - userAttendance

  // Check current status
  if (userAttendance > totalHoursInSemester * 0.5) {
    return {
      currentAttendance,
      totalHours: hoursUntilToday,
      futureHours,
      hoursToMakeUp: 0,
      daysNeeded: 0,
      targetDate: null,
      status: "success",
      totalHoursInSemester,
    }
  }

  // Check if recoverable
  if (hoursNeeded > futureHours) {
    return {
      currentAttendance,
      totalHours: hoursUntilToday,
      futureHours,
      hoursToMakeUp: hoursNeeded,
      daysNeeded: -1,
      targetDate: null,
      status: "failed",
      totalHoursInSemester,
    }
  }

  // Calculate how many days needed
  let accumulatedHours = userAttendance
  let daysNeeded = 0
  let targetDate: Date | null = null

  for (const day of futureDays) {
    accumulatedHours += day.hours
    daysNeeded++
    if (accumulatedHours > totalHoursInSemester * 0.5) {
      targetDate = day.date
      break
    }
  }

  return {
    currentAttendance,
    totalHours: hoursUntilToday,
    futureHours,
    hoursToMakeUp: hoursNeeded,
    daysNeeded,
    targetDate,
    status: "recoverable",
    totalHoursInSemester,
  }
}

function calculateSubjectAttendance(userAttendance: number, today: Date, subjectKey: string): SubjectCalculationResult {
  const baseHours = SUBJECT_BASE_HOURS[subjectKey] || 0
  
  // Calculate hours from BASE_DATE+1 to today for this subject
  let hoursUntilToday = baseHours
  const currentDate = new Date(BASE_DATE)
  currentDate.setDate(currentDate.getDate() + 1) // Start from March 10

  while (currentDate <= today) {
    if (isSchoolDay(currentDate)) {
      hoursUntilToday += getSubjectHoursForDay(currentDate, subjectKey)
    }
    currentDate.setDate(currentDate.getDate() + 1)
  }

  // Calculate future hours from tomorrow to END_DATE
  let futureHours = 0
  const futureDays: { date: Date; hours: number }[] = []
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const futureDate = new Date(tomorrow)

  while (futureDate <= END_DATE) {
    if (isSchoolDay(futureDate)) {
      const hours = getSubjectHoursForDay(futureDate, subjectKey)
      if (hours > 0) {
        futureHours += hours
        futureDays.push({ date: new Date(futureDate), hours })
      }
    }
    futureDate.setDate(futureDate.getDate() + 1)
  }

  const totalHoursInSemester = hoursUntilToday + futureHours
  const requiredFor50Percent = Math.floor(totalHoursInSemester * 0.5) + 1
  const currentAttendance = hoursUntilToday > 0 ? (userAttendance / hoursUntilToday) * 100 : 0
  const hoursNeeded = requiredFor50Percent - userAttendance

  // Check current status
  if (userAttendance > totalHoursInSemester * 0.5) {
    return {
      currentAttendance,
      totalHours: hoursUntilToday,
      futureHours,
      hoursToMakeUp: 0,
      daysNeeded: 0,
      lessonsNeeded: 0,
      targetDate: null,
      status: "success",
      totalHoursInSemester,
    }
  }

  // Check if recoverable
  if (hoursNeeded > futureHours) {
    return {
      currentAttendance,
      totalHours: hoursUntilToday,
      futureHours,
      hoursToMakeUp: hoursNeeded,
      daysNeeded: -1,
      lessonsNeeded: -1,
      targetDate: null,
      status: "failed",
      totalHoursInSemester,
    }
  }

  // Calculate how many lessons needed
  let accumulatedHours = userAttendance
  let lessonsNeeded = 0
  let targetDate: Date | null = null

  for (const day of futureDays) {
    accumulatedHours += day.hours
    lessonsNeeded += day.hours
    if (accumulatedHours > totalHoursInSemester * 0.5) {
      targetDate = day.date
      break
    }
  }

  return {
    currentAttendance,
    totalHours: hoursUntilToday,
    futureHours,
    hoursToMakeUp: hoursNeeded,
    daysNeeded: futureDays.filter((_, i) => i < lessonsNeeded).length,
    lessonsNeeded: hoursNeeded,
    targetDate,
    status: "recoverable",
    totalHoursInSemester,
  }
}

export function AttendanceCalculator() {
  const [activeTab, setActiveTab] = useState<"general" | "subjects">("general")
  const [attendance, setAttendance] = useState<string>("")
  const [showResults, setShowResults] = useState(false)
  const [result, setResult] = useState<CalculationResult | null>(null)
  
  // Subject tab state
  const [selectedSubject, setSelectedSubject] = useState<string>("")
  const [subjectAttendance, setSubjectAttendance] = useState<string>("")
  const [showSubjectResults, setShowSubjectResults] = useState(false)
  const [subjectResult, setSubjectResult] = useState<SubjectCalculationResult | null>(null)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  const today = useMemo(() => new Date(), [])
  
  const totalHoursToday = useMemo(() => {
    let hours = BASE_HOURS
    const currentDate = new Date(BASE_DATE)
    currentDate.setDate(currentDate.getDate() + 1)

    while (currentDate <= today) {
      if (isSchoolDay(currentDate)) {
        hours += getHoursForDay(currentDate)
      }
      currentDate.setDate(currentDate.getDate() + 1)
    }
    return hours
  }, [today])

  const getSubjectHoursToday = useMemo(() => {
    return (subjectKey: string) => {
      let hours = SUBJECT_BASE_HOURS[subjectKey] || 0
      const currentDate = new Date(BASE_DATE)
      currentDate.setDate(currentDate.getDate() + 1)

      while (currentDate <= today) {
        if (isSchoolDay(currentDate)) {
          hours += getSubjectHoursForDay(currentDate, subjectKey)
        }
        currentDate.setDate(currentDate.getDate() + 1)
      }
      return hours
    }
  }, [today])

  const handleCalculate = () => {
    const userAttendance = parseInt(attendance, 10)
    if (isNaN(userAttendance) || userAttendance < 0) {
      return
    }
    const calcResult = calculateAttendance(userAttendance, today)
    setResult(calcResult)
    setShowResults(true)
  }

  const handleSubjectCalculate = () => {
    if (!selectedSubject) return
    const userAttendance = parseInt(subjectAttendance, 10)
    if (isNaN(userAttendance) || userAttendance < 0) {
      return
    }
    const calcResult = calculateSubjectAttendance(userAttendance, today, selectedSubject)
    setSubjectResult(calcResult)
    setShowSubjectResults(true)
  }

  const handleTabChange = (tab: "general" | "subjects") => {
    setActiveTab(tab)
    // Reset results when switching tabs
    setShowResults(false)
    setShowSubjectResults(false)
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8 flex items-center justify-center">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-2"
        >
          <div className="flex items-center justify-center gap-3">
            <div className="p-3 rounded-2xl bg-card backdrop-blur-xl border border-border">
              <GraduationCap className="w-8 h-8 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-emerald-400 to-teal-400 bg-clip-text text-transparent">
            Kalkulator Frekwencji
          </h1>
          <p className="text-muted-foreground text-sm">
            Sprawdź swoją frekwencję i zaplanuj obecności
          </p>
        </motion.div>

        {/* Tab Switcher */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="relative flex p-1 rounded-2xl bg-card/60 backdrop-blur-xl border border-border"
        >
          <motion.div
            className="absolute top-1 bottom-1 rounded-xl bg-primary/20 border border-primary/30"
            initial={false}
            animate={{
              left: activeTab === "general" ? "4px" : "50%",
              width: "calc(50% - 8px)",
            }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
          <button
            onClick={() => handleTabChange("general")}
            className={`relative z-10 flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === "general" ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Calculator className="w-4 h-4" />
            Ogólna
          </button>
          <button
            onClick={() => handleTabChange("subjects")}
            className={`relative z-10 flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === "subjects" ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Przedmioty
          </button>
        </motion.div>

        <AnimatePresence mode="wait">
          {activeTab === "general" ? (
            <motion.div
              key="general"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              {/* Total Hours Card */}
              <div className="relative overflow-hidden rounded-2xl bg-card/80 backdrop-blur-xl border border-border p-6">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
                <div className="relative">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">Wszystkie odbyte lekcje na dzień dzisiejszy ({formatDatePL(today)})</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-6xl font-bold text-foreground tabular-nums">
                      {totalHoursToday}
                    </span>
                    <span className="text-xl text-muted-foreground">godzin</span>
                  </div>
                </div>
              </div>

              {/* Input Section */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-primary" />
                    Wpisz swoje obecności w tym semestrze (obecności + zwolnienia + spóźnienia):
                  </label>
                  <input
                    type="number"
                    value={attendance}
                    onChange={(e) => setAttendance(e.target.value)}
                    placeholder="np. 120"
                    className="w-full h-14 px-4 text-2xl text-center font-semibold rounded-2xl bg-card/80 backdrop-blur-xl border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  />
                </div>

                <motion.button
                  onClick={handleCalculate}
                  disabled={!attendance}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full h-14 rounded-2xl bg-gradient-to-r from-primary to-emerald-500 text-primary-foreground font-semibold text-lg shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-all flex items-center justify-center gap-2"
                >
                  <TrendingUp className="w-5 h-5" />
                  Oblicz moją frekwencję
                </motion.button>
              </div>

              {/* Results Section */}
              <AnimatePresence mode="wait">
                {showResults && result && (
                  <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="space-y-4"
                  >
                    {/* Stats Card */}
                    <div className="rounded-2xl bg-card/80 backdrop-blur-xl border border-border overflow-hidden">
                      <div className="p-4 space-y-3">
                        <ResultRow 
                          label="Obecna frekwencja" 
                          value={`${result.currentAttendance.toFixed(1)}%`}
                          highlight={result.status === "success"}
                        />
                        <div className="h-px bg-border" />
                        <ResultRow 
                          label="Wszystkie lekcje w semestrze" 
                          value={result.totalHoursInSemester.toString()}
                        />
                        <div className="h-px bg-border" />
                        <ResultRow 
                          label="Potrzebne obecności na koniec" 
                          value={Math.ceil(result.totalHoursInSemester * 0.5 + 1).toString()}
                        />
                        <div className="h-px bg-border" />
                        <ResultRow 
                          label="Do odrobienia" 
                          value={result.hoursToMakeUp > 0 ? result.hoursToMakeUp.toString() : "0"}
                          danger={result.status === "failed"}
                        />
                      </div>
                    </div>

                    {/* Status Message */}
                    <StatusCard result={result} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div
              key="subjects"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              {/* Subject Selector */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary" />
                  Wybierz przedmiot
                </label>
                <div className="relative">
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="w-full h-14 px-4 rounded-2xl bg-card/80 backdrop-blur-xl border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all flex items-center justify-between"
                  >
                    <span className={selectedSubject ? "text-foreground" : "text-muted-foreground/50"}>
                      {selectedSubject ? SUBJECT_NAMES[selectedSubject] : "Wybierz przedmiot..."}
                    </span>
                    <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
                  </button>
                  
                  <AnimatePresence>
                    {isDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute z-50 w-full mt-2 rounded-2xl bg-card/95 backdrop-blur-xl border border-border shadow-xl overflow-hidden max-h-64 overflow-y-auto"
                      >
                        {Object.entries(SUBJECT_NAMES).map(([key, name]) => (
                          <button
                            key={key}
                            onClick={() => {
                              setSelectedSubject(key)
                              setIsDropdownOpen(false)
                              setShowSubjectResults(false)
                              setSubjectAttendance("")
                            }}
                            className={`w-full px-4 py-3 text-left hover:bg-primary/10 transition-colors ${
                              selectedSubject === key ? "bg-primary/20 text-primary" : "text-foreground"
                            }`}
                          >
                            {name}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Subject Hours Card */}
              <AnimatePresence mode="wait">
                {selectedSubject && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-4"
                  >
                    <div className="relative overflow-hidden rounded-2xl bg-card/80 backdrop-blur-xl border border-border p-6">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
                      <div className="relative">
                        <div className="flex items-center gap-2 text-muted-foreground mb-2">
                          <Clock className="w-4 h-4" />
                          <span className="text-sm">Wszystkie lekcje wybranego przedmiotu na dzień dzisiejszy:</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-6xl font-bold text-foreground tabular-nums">
                            {getSubjectHoursToday(selectedSubject)}
                          </span>
                          <span className="text-xl text-muted-foreground">lekcji</span>
                        </div>
                      </div>
                    </div>

                    {/* Input Section */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground flex items-center gap-2">
                        <Calculator className="w-4 h-4 text-primary" />
                        Wpisz swoje obecności na tym przedmiocie:
                      </label>
                      <input
                        type="number"
                        value={subjectAttendance}
                        onChange={(e) => setSubjectAttendance(e.target.value)}
                        placeholder="np. 15"
                        className="w-full h-14 px-4 text-2xl text-center font-semibold rounded-2xl bg-card/80 backdrop-blur-xl border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                      />
                    </div>

                    <motion.button
                      onClick={handleSubjectCalculate}
                      disabled={!subjectAttendance}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full h-14 rounded-2xl bg-gradient-to-r from-primary to-emerald-500 text-primary-foreground font-semibold text-lg shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-all flex items-center justify-center gap-2"
                    >
                      <TrendingUp className="w-5 h-5" />
                      Oblicz frekwencję
                    </motion.button>

                    {/* Subject Results */}
                    <AnimatePresence mode="wait">
                      {showSubjectResults && subjectResult && (
                        <motion.div
                          initial={{ opacity: 0, y: 20, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -20, scale: 0.95 }}
                          transition={{ duration: 0.4, ease: "easeOut" }}
                          className="space-y-4"
                        >
                          {/* Stats Card */}
                          <div className="rounded-2xl bg-card/80 backdrop-blur-xl border border-border overflow-hidden">
                            <div className="p-4 space-y-3">
                              <ResultRow 
                                label="Obecna frekwencja" 
                                value={`${subjectResult.currentAttendance.toFixed(1)}%`}
                                highlight={subjectResult.status === "success"}
                              />
                              <div className="h-px bg-border" />
                              <ResultRow 
                                label="Wszystkie lekcje w semestrze" 
                                value={subjectResult.totalHoursInSemester.toString()}
                              />
                              <div className="h-px bg-border" />
                              <ResultRow 
                                label="Potrzebne obecności na koniec" 
                                value={Math.ceil(subjectResult.totalHoursInSemester * 0.5 + 1).toString()}
                              />
                              <div className="h-px bg-border" />
                              <ResultRow 
                                label="Do odrobienia" 
                                value={subjectResult.hoursToMakeUp > 0 ? subjectResult.hoursToMakeUp.toString() : "0"}
                                danger={subjectResult.status === "failed"}
                              />
                            </div>
                          </div>

                          {/* Status Message */}
                          <SubjectStatusCard result={subjectResult} subjectName={SUBJECT_NAMES[selectedSubject]} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function ResultRow({ 
  label, 
  value, 
  highlight = false,
  danger = false 
}: { 
  label: string
  value: string
  highlight?: boolean
  danger?: boolean 
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className={`font-bold tabular-nums ${
        highlight ? "text-primary" : danger ? "text-destructive" : "text-foreground"
      }`}>
        {value}
      </span>
    </div>
  )
}

function StatusCard({ result }: { result: CalculationResult }) {
  if (result.status === "success") {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl bg-primary/10 border border-primary/30 p-4"
      >
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-6 h-6 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-primary">Gratulacje!</p>
            <p className="text-sm text-primary/80 mt-1">
              Masz już ponad 50% frekwencji. Tak trzymaj!
            </p>
          </div>
        </div>
      </motion.div>
    )
  }

  if (result.status === "failed") {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl bg-destructive/10 border border-destructive/30 p-4"
      >
        <div className="flex items-start gap-3">
          <XCircle className="w-6 h-6 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-destructive">Niestety...</p>
            <p className="text-sm text-destructive/80 mt-1">
              Nawet gdybyś chodził/a na wszystkie pozostałe lekcje, nie uda się przekroczyć progu 50%. 
              Brakuje Ci {result.hoursToMakeUp - result.futureHours} godzin więcej niż zostało w semestrze.
            </p>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl bg-warning/10 border border-warning/30 p-4"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-warning shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-warning">Jeszcze się da!</p>
            <p className="text-sm text-warning/80 mt-1">
              Aby dobić do ponad 50%, musisz przyjść na jeszcze{" "}
              <span className="font-bold text-warning">{result.daysNeeded} dni</span> szkolnych.
            </p>
          </div>
        </div>
      </motion.div>

      {result.targetDate && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl bg-card/80 backdrop-blur-xl border-2 border-primary/50 p-4"
        >
          <div className="flex items-start gap-3">
            <Calendar className="w-6 h-6 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-muted-foreground">
                Jeśli zaczniesz chodzić od jutra bez żadnej wtopy, przekroczysz próg dokładnie dnia:
              </p>
              <p className="text-2xl font-bold text-primary mt-1">
                {formatDateFullPL(result.targetDate)}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </>
  )
}

function SubjectStatusCard({ result, subjectName }: { result: SubjectCalculationResult; subjectName: string }) {
  if (result.status === "success") {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl bg-primary/10 border border-primary/30 p-4"
      >
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-6 h-6 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-primary">Gratulacje!</p>
            <p className="text-sm text-primary/80 mt-1">
              Masz już ponad 50% frekwencji z wybranego przedmiotu. Tak trzymaj!
            </p>
          </div>
        </div>
      </motion.div>
    )
  }

  if (result.status === "failed") {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl bg-destructive/10 border border-destructive/30 p-4"
      >
        <div className="flex items-start gap-3">
          <XCircle className="w-6 h-6 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-destructive">Niestety...</p>
            <p className="text-sm text-destructive/80 mt-1">
              Nawet gdybyś chodził/a na wszystkie pozostałe lekcje wybranego przedmiotu, nie uda się przekroczyć progu 50%. 
              Brakuje Ci {result.hoursToMakeUp - result.futureHours} lekcji więcej niż zostało w semestrze.
            </p>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl bg-warning/10 border border-warning/30 p-4"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-warning shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-warning">Jeszcze się da!</p>
            <p className="text-sm text-warning/80 mt-1">
              Aby dobić do ponad 50% z wybranego przedmiotu, musisz przyjść na jeszcze{" "}
              <span className="font-bold text-warning">{result.lessonsNeeded} lekcji</span>.
            </p>
          </div>
        </div>
      </motion.div>

      {result.targetDate && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl bg-card/80 backdrop-blur-xl border-2 border-primary/50 p-4"
        >
          <div className="flex items-start gap-3">
            <Calendar className="w-6 h-6 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-muted-foreground">
                Jeśli zaczniesz chodzić od jutra bez żadnej wtopy, przekroczysz próg dokładnie dnia:
              </p>
              <p className="text-2xl font-bold text-primary mt-1">
                {formatDateFullPL(result.targetDate)}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </>
  )
}
