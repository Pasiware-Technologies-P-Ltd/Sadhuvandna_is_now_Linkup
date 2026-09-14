import json
with open('d:/bangosambadApp/src/screens/news/CreateNewsScreen.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

replacements = {
    "'ताज़ा खबर'": "'Breaking News'",
    "'राष्ट्रीय'": "'National'",
    "'राज्य'": "'State'",
    "'जिला'": "'District'",
    "'राजनीति'": "'Politics'",
    "'धर्म'": "'Religion'",
    "'शिक्षा'": "'Education'",
    "'खेल'": "'Sports'",
    "'व्यापार'": "'Business'",
    "'कृषि'": "'Agriculture'",
    "'मनोरंजन'": "'Entertainment'",
    "'सामाजिक'": "'Social'",
    "'दुर्घटना'": "'Accident'",
    "'मृत्यु/श्रद्धांजलि'": "'Obituary/Tribute'",
    "'विज्ञापन'": "'Advertisement'",
    "category === 'राज्य'": "category === 'State'",
    "category === 'जिला'": "category === 'District'"
}

for k, v in replacements.items():
    content = content.replace(k, v)

with open('d:/bangosambadApp/src/screens/news/CreateNewsScreen.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
