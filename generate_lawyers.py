import json
import os
import random

first_names = [
    "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Ayaan", "Krishna", "Ishaan", "Shaurya",
    "Sanya", "Kavya", "Isha", "Riya", "Aanya", "Aarohi", "Anika", "Diya", "Navya", "Sneha",
    "Rahul", "Rohan", "Vikram", "Sanjay", "Amit", "Rajesh", "Surya", "Karthik", "Manish", "Prakash",
    "Neha", "Priya", "Anjali", "Pooja", "Meera", "Swati", "Divya", "Shruti", "Preeti", "Kiran"
]

last_names = [
    "Sharma", "Patel", "Kumar", "Singh", "Das", "Gupta", "Verma", "Rathore", "Iyer", "Mehta",
    "Chatterjee", "Khanna", "Reddy", "Ali", "Kaur", "Deshmukh", "Joshi", "Bansal", "Chauhan",
    "Mishra", "Pandey", "Yadav", "Nair", "Menon", "Bose", "Sengupta", "Choudhury", "Pillai"
]

specializations = [
    "Corporate Law", "Constitutional Law", "Criminal Law", "Cyber Law", "Divorce and Family Law",
    "Environmental Law", "Family Law", "Human Rights Law", "Immigration Law", 
    "Intellectual Property Law", "Property Law", "Real Estate Law", "Tax Law"
]

locations = [
    "Ahmedabad, Gujarat", "Bangalore, Karnataka", "Chandigarh, Punjab", "Chennai, Tamil Nadu", 
    "Gurgaon, Haryana", "Hyderabad, Telangana", "Kolkata, West Bengal", "Lucknow, Uttar Pradesh", 
    "Mumbai, Maharashtra", "New Delhi, Delhi", "Pune, Maharashtra", "Surat, Gujarat"
]

colleges = [
    "National Law School of India University", "NALSAR University of Law", "Faculty of Law, Delhi University", 
    "Symbiosis Law School", "Jindal Global Law School", "ILS Law College", "Gujarat National Law University",
    "National Law Institute University", "Rajiv Gandhi National University of Law", "Dr. Ram Manohar Lohiya National Law University"
]

courts = [
    "Supreme Court of India", "Delhi High Court", "Bombay High Court", "Madras High Court", 
    "Karnataka High Court", "Calcutta High Court", "Allahabad High Court", "Gujarat High Court", 
    "Punjab and Haryana High Court", "District Courts"
]

achievements = [
    "Top 10 Lawyers 2023", "Bar Council Excellence Award", "Pro Bono Lawyer of the Year", 
    "Featured in Legal Times", "Best Litigator Award", "National Justice Award", 
    "Excellence in Legal Strategy", "Young Lawyer of the Year", "Lifetime Achievement in Law"
]

lawyers = []
for i in range(100):
    name = f"{random.choice(first_names)} {random.choice(last_names)}"
    spec = random.choice(specializations)
    loc = random.choice(locations)
    exp = random.randint(3, 35)
    college = random.choice(colleges)
    grad_year = 2024 - exp - random.randint(1, 3)
    court = random.choice(courts)
    achievement = random.choice(achievements)
    
    state_code = loc.split(",")[1].strip()[:3].upper() if "," in loc else "DEL"
    bar_id = f"{state_code}/{random.randint(100, 9999)}/{grad_year + 1}"
    
    # generate email based on name
    email = f"{name.lower().replace(' ', '.')}@example.com"
    
    bio = f"{name} is a distinguished legal professional specializing in {spec}. Graduating from {college} in {grad_year}, they have built a robust practice focusing on complex litigation and advisory services. Practicing primarily at the {court}, {name.split()[0]} has been recognized for their strategic acumen and was recently awarded '{achievement}'. They remain committed to delivering justice and providing transparent, result-oriented legal counsel to all clients across {loc}."
    
    lawyers.append({
        "name": name,
        "specialization": spec,
        "location": loc,
        "contact": email,
        "experience_years": exp,
        "graduation_college": college,
        "graduation_year": grad_year,
        "achievements": achievement,
        "court_level": court,
        "bio": bio,
        "bar_council_id": bar_id
    })

sample_file = os.path.join("backend", "modules", "lawyer_directory", "sample_lawyers.json")
with open(sample_file, "w") as f:
    json.dump(lawyers, f, indent=4)

print(f"Generated {len(lawyers)} lawyers and saved to {sample_file}")
