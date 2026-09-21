import json
import os
import random

sample_file = os.path.join("backend", "modules", "lawyer_directory", "sample_lawyers.json")

colleges = ["National Law School of India University", "NALSAR University of Law", "Faculty of Law, Delhi University", "Symbiosis Law School", "Jindal Global Law School", "ILS Law College"]
courts = ["Supreme Court of India", "Delhi High Court", "Bombay High Court", "Madras High Court", "District Courts"]
achievements = ["Top 10 Lawyers 2023", "Bar Council Excellence Award", "Pro Bono Lawyer of the Year", "Featured in Legal Times", "Best Litigator Award"]

if os.path.exists(sample_file):
    with open(sample_file, "r") as f:
        lawyers_data = json.load(f)
        
    for idx, l in enumerate(lawyers_data):
        l["graduation_college"] = random.choice(colleges)
        l["graduation_year"] = 2023 - l["experience_years"] - random.randint(1, 3) # Add a few years gap
        l["achievements"] = random.choice(achievements)
        l["court_level"] = random.choice(courts)
        l["bio"] = f"{l['name']} is a distinguished legal professional specializing in {l['specialization']}. Graduating from {l['graduation_college']} in {l['graduation_year']}, they have built a robust practice focusing on complex litigation and advisory services. Practicing primarily at the {l['court_level']}, {l['name']} has been recognized for their strategic acumen and was recently awarded '{l['achievements']}'. They remain committed to delivering justice and providing transparent, result-oriented legal counsel to all clients."

    with open(sample_file, "w") as f:
        json.dump(lawyers_data, f, indent=4)
    print("Updated sample_lawyers.json")
