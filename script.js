// CV Score Checker — everything runs in the browser, no data is sent anywhere.
// Sample CV and job description below are fictional, for demo only.

const STOPWORDS = new Set([
  "the","and","for","with","you","your","are","our","this","that","will","have","has",
  "from","into","about","after","before","under","over","between","through","during",
  "being","been","also","such","than","then","them","they","their","there","these",
  "those","what","when","where","which","while","would","could","should","must",
  "able","per","via","etc","using","used","use","work","working","team","role",
  "candidate","required","requirements","experience","years","year","skills","skill",
  "good","strong","ability","including","within","join","looking","seeking","apply",
  "position","company","responsibilities","responsibility","knowledge","understanding"
]);

// Common multi-word skills to catch as phrases.
const PHRASES = [
  "machine learning", "data entry", "customer support", "microsoft office",
  "google sheets", "problem solving", "time management", "web development",
  "front end", "frontend", "back end", "content writing", "social media",
  "data analysis", "project management"
];

const SAMPLE_CV = `Ayesha Khan
Frontend Developer | ayesha.demo@example.com | +92 300 0000000

SUMMARY
Frontend developer with 2 years of experience building responsive websites
in HTML, CSS and JavaScript. PITP certified web developer.

SKILLS
HTML, CSS, JavaScript, Python, Git, GitHub, MySQL, Excel, MS Word

EXPERIENCE
Frontend Developer Intern — Demo Studio, Lahore (2025)
- Built 5 responsive landing pages in HTML, CSS and JavaScript
- Fixed website bugs and improved page loading speed
- Worked with clients on website content updates

EDUCATION
BS Computer Science — Demo University (2022–2026)`;

const SAMPLE_JD = `Frontend Developer (Remote)
We are looking for a frontend developer to build responsive websites
in HTML, CSS and JavaScript. You should know React, Git and GitHub,
and have experience with responsive design and problem solving.
Familiarity with Python, MySQL and Excel is a plus. You will work
with our team on client projects, fix website bugs and update
website content. Good communication skills and time management
are required.`;

function tokenize(text) {
  return text.toLowerCase().replace(/[^a-z0-9+#. ]/g, " ").split(/\s+/).filter(Boolean);
}

function extractKeywords(jdText, cvText) {
  const jd = jdText.toLowerCase();
  const cv = cvText.toLowerCase();
  const found = new Map(); // keyword -> count in JD

  // Multi-word phrases first.
  for (const phrase of PHRASES) {
    if (jd.includes(phrase)) {
      found.set(phrase, (jd.split(phrase).length - 1));
    }
  }

  // Single words, ranked by frequency in the job description.
  const counts = {};
  for (const w of tokenize(jdText)) {
    const word = w.replace(/[.#+]$/, "");
    if (word.length < 3 || STOPWORDS.has(word)) continue;
    if (/\d/.test(word)) continue;
    counts[word] = (counts[word] || 0) + 1;
  }
  const ranked = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([w]) => w);

  for (const w of ranked) {
    if (!found.has(w)) found.set(w, counts[w]);
  }

  const keywords = [...found.keys()].slice(0, 20);
  const matched = keywords.filter(k => cv.includes(k));
  const missing = keywords.filter(k => !cv.includes(k));
  return { keywords, matched, missing };
}

function sectionScore(cvText) {
  const cv = cvText.toLowerCase();
  const checks = [
    /@|email|phone|\+92|contact/.test(cv),                 // contact info
    /experience|intern|work history|employment/.test(cv),  // experience
    /education|degree|university|college|bscs|b\.?sc/.test(cv), // education
    /skills|technologies|tools/.test(cv)                   // skills
  ];
  const hit = checks.filter(Boolean).length;
  return { pct: Math.round((hit / checks.length) * 100), hit, total: checks.length, checks };
}

function lengthScore(cvText) {
  const words = tokenize(cvText).length;
  if (words >= 150 && words <= 600) return { pct: 100, words };
  if (words >= 80 && words < 150) return { pct: 70, words };
  if (words > 600 && words <= 900) return { pct: 70, words };
  if (words >= 40 && words < 80) return { pct: 40, words };
  return { pct: 20, words };
}

function verdictFor(score) {
  if (score >= 80) return ["Strong Match", "Your CV lines up well with this job. A few small tweaks could make it even stronger."];
  if (score >= 60) return ["Good — a few gaps", "Your CV covers most of what the job asks for. Add the missing keywords below to lift your score."];
  if (score >= 40) return ["Needs Work", "Your CV is missing several things this job asks for. Add the missing keywords naturally into your skills and experience."];
  return ["Weak Match", "This CV does not match this job description yet. Rewrite your skills and experience around what the job actually asks for."];
}

function checkScore() {
  const cvText = document.getElementById("cvText").value.trim();
  const jdText = document.getElementById("jdText").value.trim();
  if (!cvText || !jdText) {
    alert("Please paste both your CV and the job description first.");
    return;
  }

  const { matched, missing } = extractKeywords(jdText, cvText);
  const kwPct = matched.length === 0 && missing.length === 0 ? 0
    : Math.round((matched.length / (matched.length + missing.length)) * 100);
  const sec = sectionScore(cvText);
  const len = lengthScore(cvText);

  // Keywords 70%, sections 15%, length 15%.
  const total = Math.round(kwPct * 0.7 + sec.pct * 0.15 + len.pct * 0.15);

  // Show results.
  document.getElementById("results").classList.remove("hidden");
  document.getElementById("scoreNum").textContent = total;
  const [title, text] = verdictFor(total);
  document.getElementById("verdict").textContent = title;
  document.getElementById("verdictText").textContent = text;

  const ring = document.getElementById("ringFg");
  const C = 490;
  ring.style.strokeDashoffset = C - (C * total) / 100;
  ring.style.stroke = total >= 80 ? "#0a7a3d" : total >= 60 ? "#0e7c7b" : total >= 40 ? "#c77f0a" : "#b3261e";

  setBar("barKeywords", "valKeywords", kwPct);
  setBar("barSections", "valSections", sec.pct);
  setBar("barLength", "valLength", len.pct);

  document.getElementById("matchedCount").textContent = `(${matched.length})`;
  document.getElementById("missingCount").textContent = `(${missing.length})`;
  fillChips("matchedList", matched, "ok", "No keywords matched — check the job description.");
  fillChips("missingList", missing, "miss", "Nothing missing — great match!");

  const tips = [];
  if (missing.length) tips.push(`Add these missing keywords naturally: ${missing.slice(0, 5).join(", ")}.`);
  if (!sec.checks[0]) tips.push("Add your email and phone number at the top of your CV.");
  if (!sec.checks[1]) tips.push("Add an Experience section — even internships and freelance work count.");
  if (!sec.checks[2]) tips.push("Add an Education section with your degree and university.");
  if (!sec.checks[3]) tips.push("Add a Skills section listing the tools the job asks for.");
  if (len.words < 150) tips.push(`Your CV is only ${len.words} words — add detail to your experience and projects.`);
  if (len.words > 600) tips.push(`Your CV is ${len.words} words — keep it to 2 pages by cutting older or less relevant detail.`);
  if (!tips.length) tips.push("Your CV is in great shape for this job — proofread once and send it.");
  document.getElementById("tipsList").innerHTML = tips.map(t => `<li>${t}</li>`).join("");

  document.getElementById("results").scrollIntoView({ behavior: "smooth" });
}

function setBar(barId, valId, pct) {
  document.getElementById(barId).style.width = pct + "%";
  document.getElementById(valId).textContent = pct + "%";
}

function fillChips(id, items, cls, emptyText) {
  const el = document.getElementById(id);
  el.innerHTML = items.length
    ? items.map(k => `<span class="chip ${cls}">${k}</span>`).join("")
    : `<span class="empty">${emptyText}</span>`;
}

document.getElementById("checkBtn").addEventListener("click", checkScore);
document.getElementById("sampleBtn").addEventListener("click", () => {
  document.getElementById("cvText").value = SAMPLE_CV;
  document.getElementById("jdText").value = SAMPLE_JD;
});
document.getElementById("clearBtn").addEventListener("click", () => {
  document.getElementById("cvText").value = "";
  document.getElementById("jdText").value = "";
  document.getElementById("results").classList.add("hidden");
});
