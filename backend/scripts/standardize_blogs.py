import os
import sys

# Add project root to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from backend.modules.db_sync.db import SessionLocal
from backend.modules.db_sync.schema import BlogPost

def standardize_all_blog_posts():
    db = SessionLocal()
    try:
        posts = db.query(BlogPost).all()
        print(f"Standardizing {len(posts)} blog posts in database...")
        
        posts_map = {
            "Theft": {
                "title": "Provisions and Penalties for Theft and Snatching under the Bharatiya Nyaya Sanhita (BNS)",
                "crime_type": "Theft & Snatching",
                "source_sections": "Section 303, Section 304 BNS",
                "body": """### Introduction
The Bharatiya Nyaya Sanhita, 2023 (BNS) modernizes India's penal provisions regarding property offenses. Unlike the erstwhile Indian Penal Code (IPC 1860), the BNS introduces distinct, statutory codification for daytime and vehicular snatching alongside traditional theft.

### Legal Provisions and Offenses

1. **Definition of Theft (Section 303 BNS):**
   - Theft is defined as dishonestly moving any movable property out of the possession of any person without that person's consent, intending to take dishonestly such property.
   - Prescribed punishment: Imprisonment of up to 3 years, or with fine, or both. For repeated offenses or theft from dwelling houses, imprisonment extends up to 7 years.

2. **Distinct Codification of Snatching (Section 304 BNS):**
   - For the first time in Indian criminal law, snatching is explicitly codified under Section 304 BNS.
   - Snatching occurs when an offender, in order to commit theft, suddenly, quickly, or forcibly seizes, secures, or grabs movable property from any person or their possession.
   - Punishment: Imprisonment for a term which may extend to 3 years, and the offender shall also be liable to a fine.

3. **Community Service for Petty First-Time Theft (Section 303(2) Proviso):**
   - Where the value of the stolen property is less than Rs. 5,000, and the offender is a first-time convict with full restitution, the court may sentence the offender to community service instead of prison.

### Police Procedure and FIR Filing (BNSS 2023)
- Under Section 173 of the Bharatiya Nagarik Suraksha Sanhita, 2023 (BNSS), police are mandated to register an FIR immediately for cognizable snatching and theft offenses.
- In cases where the incident occurs outside the local police station limits, a Zero FIR must be registered without delay and transferred to the jurisdictional police station."""
            },
            "Assault": {
                "title": "Understanding Assault and Criminal Force under the Bharatiya Nyaya Sanhita (BNS)",
                "crime_type": "Assault & Force",
                "source_sections": "Section 128, Section 130, Section 131 BNS",
                "body": """### Introduction
Under the Bharatiya Nyaya Sanhita, 2023 (BNS), the law maintains a strict distinction between criminal force, simple assault, and grievous hurt, ensuring that physical violence and bodily threats are penalized effectively.

### Key Classifications

1. **Criminal Force (Section 128 BNS):**
   - Defined as intentionally using force against any person without their consent, in order to commit any offense, or intending to cause injury, fear, or annoyance.
   - Punishment under Section 131 BNS: Imprisonment of up to 3 months, or fine up to Rs. 1,000, or both.

2. **Assault (Section 130 BNS):**
   - Defined as making any gesture or preparation intending or knowing it to be likely that such gesture will cause any person present to apprehend criminal force.
   - Mere words alone do not amount to an assault unless accompanied by gestures or threatening acts.

3. **Assault on Public Servants (Section 132 BNS):**
   - Assault or criminal force to deter a public servant from discharge of duty carries stringent punishment of up to 5 years imprisonment and fine.

### Procedural Remedies under BNSS 2023
- Assault causing simple hurt is generally non-cognizable, whereas assault with dangerous weapons or against public servants is cognizable and non-bailable.
- Victims can seek immediate medical examination under Section 51 BNSS and record statements before a Magistrate under Section 183 BNSS."""
            },
            "Cybercrime": {
                "title": "Handling Cybercrimes and Electronic Record Forgery in the BNS and BSA",
                "crime_type": "Cybercrime & Forgery",
                "source_sections": "Section 336, Section 338 BNS; Section 61, Section 63 BSA",
                "body": """### Introduction
The modernization of Indian law via the Bharatiya Nyaya Sanhita (BNS 2023) and Bharatiya Sakshya Adhiniyam (BSA 2023) creates a comprehensive framework for tackling digital fraud, identity theft, electronic record forgery, and cyber-enabled offenses.

### Statutory Provisions

1. **Electronic Records and Forgery (Section 336 & 338 BNS):**
   - The BNS defines forgery to encompass digital signatures, electronic records, counterfeit digital certificates, and spoofed electronic transmissions.
   - Anyone creating false electronic records with intent to cause damage or commit fraud faces imprisonment up to 2 years (simple forgery) or up to 7 years with fine for forged valuable securities.

2. **Admissibility of Digital Evidence (Section 61 & 63 BSA):**
   - Replacing Section 65B of the Indian Evidence Act, Section 63 of BSA 2023 explicitly governs the admissibility of electronic records (server logs, CCTV footage, mobile messages, emails, UPI logs).
   - Electronic evidence is admissible as primary/secondary documentary evidence accompanied by an electronic certificate.

3. **Cyber Fraud and Cheating by Personation (Section 318 & 319 BNS):**
   - Online phishing, spoofing identities, and fake customer care portals are prosecuted under Section 319 BNS (Cheating by Personation) punishable with up to 5 years imprisonment.

### Citizen Rights and Emergency Reporting
- Victims of cyber fraud can immediately report incidents to the National Cyber Crime Reporting Portal (cybercrime.gov.in) or dial 1930 for urgent financial freezing.
- Under Section 173(1) BNSS, electronic communication of complaints (e-FIR) is legally recognized, subject to signing within 3 days."""
            },
            "Women's Safety": {
                "title": "Key Provisions in BNS Regarding Crimes Against Women and Children",
                "crime_type": "Women's Safety",
                "source_sections": "Section 64, Section 69, Section 74, Section 79 BNS",
                "body": """### Introduction
Chapter V of the Bharatiya Nyaya Sanhita, 2023 (BNS) prioritizes offenses against women and children, introducing landmark provisions against deceitful marriage promises, gang rape, stalking, and voyeurism.

### Crucial Protections under BNS 2023

1. **Sexual Intercourse on Deceitful Promise of Marriage (Section 69 BNS):**
   - For the first time, sexual intercourse induced by deceitful means (false promise of employment, promotion, or marriage without intent to fulfill) is codified as a distinct offense punishable with rigorous imprisonment of up to 10 years and fine.

2. **Rape and Gang Rape (Section 64 & 70 BNS):**
   - Rape under Section 64 BNS carries rigorous imprisonment of not less than 10 years extending to life. Gang rape under Section 70 BNS carries a minimum of 20 years extending to life imprisonment.

3. **Outraging Modesty and Sexual Harassment (Section 74 & 75 BNS):**
   - Assault or criminal force to outrage the modesty of a woman is punishable with 1 to 5 years imprisonment. Sexual harassment (unwelcome physical contact, sexually colored remarks) carries up to 3 years.

4. **Stalking and Voyeurism (Section 77 & 78 BNS):**
   - Physical and electronic/online monitoring of women constitutes stalking, carrying up to 3 years for first offense and 5 years for repeated convictions.

### Procedural Guarantees under BNSS 2023
- Statements of victims of sexual offenses must be recorded by a woman police officer and audio-video recorded (Section 176 BNSS).
- Victims are entitled to free medical treatment across all government and private hospitals under Section 397 BNSS."""
            },
            "Murder & Culpable Homicide": {
                "title": "Differences Between Murder and Culpable Homicide Not Amounting to Murder Under the BNS",
                "crime_type": "Homicide & Offenses Against Life",
                "source_sections": "Section 100, Section 103, Section 105 BNS",
                "body": """### Introduction
The Bharatiya Nyaya Sanhita, 2023 (BNS) clearly delineates the degrees of criminal culpability in homicides, categorizing offenses into Culpable Homicide (Section 100) and Murder (Section 103).

### Key Legal Distinctions

1. **Culpable Homicide (Section 100 BNS):**
   - Occurs when death is caused by an act done with the intention of causing death, or causing bodily injury likely to cause death, or with knowledge that the act is likely to cause death.

2. **When Culpable Homicide is Murder (Section 101 & 103 BNS):**
   - Culpable homicide escalates to murder when the act is done with the definite intention of causing death, or causing bodily injury sufficient in the ordinary course of nature to cause death, or with imminently dangerous knowledge.
   - Punishment for Murder (Section 103(1) BNS): Death or imprisonment for life, and liability to fine.

3. **Culpable Homicide Not Amounting to Murder (Section 105 BNS):**
   - Applies when the offense falls within statutory exceptions: Grave & sudden provocation, right of private defense exceeded in good faith, lawful duty exceeded, sudden fight in heat of passion, or consent of adult victim.
   - Punishment: Imprisonment for life or up to 10 years with fine.

4. **Organized Mob Lynching (Section 103(2) BNS):**
   - When a murder is committed by a mob of five or more persons on grounds of race, caste, sex, place of birth, or religion, each person is punishable with death or life imprisonment."""
            },
            "Kidnapping & Abduction": {
                "title": "Laws and Penalties Related to Kidnapping, Abduction, and Human Trafficking in India",
                "crime_type": "Kidnapping & Trafficking",
                "source_sections": "Section 137, Section 138, Section 143 BNS",
                "body": """### Introduction
Under the Bharatiya Nyaya Sanhita, 2023 (BNS), child protection and anti-trafficking laws have been strengthened with severe non-bailable penalties to dismantle organized trafficking networks.

### Legal Definitions and Penalties

1. **Kidnapping from India and Lawful Guardianship (Section 137 BNS):**
   - Taking or enticing a minor (under 18 years) or person of unsound mind out of the keeping of the lawful guardian without consent.
   - Punishment: Imprisonment for up to 7 years and fine.

2. **Abduction (Section 138 BNS):**
   - Compelling by force or inducing by deceitful means any person to go from any place.
   - Abduction becomes an aggravated offense when done for ransom, murder, or wrongful confinement (punishable with imprisonment up to life).

3. **Trafficking of Persons (Section 143 BNS):**
   - Recruitment, transportation, harboring, or receipt of persons for exploitation (physical, sexual, forced labor, organ removal).
   - Trafficking of minors carries rigorous imprisonment of not less than 10 years extending to life imprisonment."""
            },
            "Defamation": {
                "title": "Understanding Defamation Under the BNS: Penalties and Legal Remedies",
                "crime_type": "Defamation & Reputation",
                "source_sections": "Section 356 BNS",
                "body": """### Introduction
Section 356 of the Bharatiya Nyaya Sanhita, 2023 (BNS) governs the law of criminal defamation in India, balancing personal reputation with constitutional freedom of speech.

### Elements of Defamation

1. **Definition (Section 356(1) BNS):**
   - Making or publishing any imputation concerning any person by words (spoken or written), signs, or visible representations, intending to harm or knowing it will harm the reputation of such person.

2. **Statutory Exceptions (Protections against Defamation):**
   - Imputation of truth for public good.
   - Public conduct of public servants in good faith.
   - Conduct of any person touching any public question.
   - Substantially true reports of proceedings of courts of justice.
   - Merits of public performances, literary works, or books.
   - Censure passed in good faith by person having lawful authority.

3. **Penalties and Community Service (Section 356(2) BNS):**
   - Punishment: Simple imprisonment for a term which may extend to 2 years, or with fine, or with both, or with **community service**."""
            },
            "Treason & Sedition": {
                "title": "Handling of Offenses Against the State in the Bharatiya Nyaya Sanhita, 2023",
                "crime_type": "Offenses Against the State",
                "source_sections": "Section 147, Section 152 BNS",
                "body": """### Introduction
The Bharatiya Nyaya Sanhita, 2023 (BNS) repeals the colonial offense of 'sedition' (IPC 124A) and replaces it with modernized provisions protecting the sovereignty, unity, and integrity of India under Section 152.

### Core Provisions

1. **Acts Endangering Sovereignty, Unity, and Integrity of India (Section 152 BNS):**
   - Penalizes exciting or attempting to excite secession, armed rebellion, subversive activities, or encouraging feelings of separatist activities by words, signs, or electronic communication.
   - Punishment: Imprisonment for life or imprisonment up to 7 years, and liability to fine.
   - Vital Safeguard: Constructive criticism, comments expressing disapprobation of government administrative measures without inciting public disorder or violence do not constitute an offense.

2. **Waging War Against the Government of India (Section 147 BNS):**
   - Waging war, attempting to wage war, or abetting the waging of war against the Government of India carries capital punishment (death) or life imprisonment with fine.

3. **Conspiracy to Commit Offenses Against the State (Section 148 BNS):**
   - Conspiring to wage war or overawe the Central Government or State Government by criminal force carries life imprisonment or imprisonment up to 10 years."""
            },
            "Fraud & Cheating": {
                "title": "Provisions for Cheating, Fraud, and Criminal Breach of Trust under the BNS",
                "crime_type": "Fraud & Cheating",
                "source_sections": "Section 316, Section 318 BNS",
                "body": """### Introduction
Commercial trust and electronic financial transactions are safeguarded under Chapter XVII of the Bharatiya Nyaya Sanhita, 2023 (BNS), providing rigorous remedies against financial fraud, cheating, and dishonest misappropriation.

### Key Statutory Offenses

1. **Criminal Breach of Trust (Section 316 BNS):**
   - Defined as dishonestly misappropriating, converting to one's own use, or dishonestly using property entrusted to a person in violation of any legal contract or direction of law.
   - Punishment: Imprisonment of up to 5 years, or fine, or both. For bankers, merchants, brokers, or attorneys, imprisonment extends up to 10 years (Section 316(5)).

2. **Cheating (Section 318 BNS):**
   - Deceiving any person fraudulently or dishonestly to deliver property or consent that any person retain property.
   - Punishment: Simple cheating carries up to 3 years imprisonment.
   - Aggravated Cheating (Section 318(4) BNS): Cheating and dishonestly inducing delivery of property carries imprisonment for up to 7 years and fine.

3. **Dishonest Misappropriation of Property (Section 314 BNS):**
   - Dishonestly misappropriating or converting movable property for one's own use carries imprisonment up to 2 years and fine."""
            },
            "Public Nuisance": {
                "title": "Understanding Public Nuisance, Health, and Safety Offenses Under the BNS",
                "crime_type": "Public Nuisance & Safety",
                "source_sections": "Section 270, Section 273, Section 292 BNS",
                "body": """### Introduction
The Bharatiya Nyaya Sanhita, 2023 (BNS) safeguards public health, safety, convenience, and environmental hygiene through codified public nuisance offenses under Chapter XV.

### Key Classifications

1. **Definition of Public Nuisance (Section 270 BNS):**
   - An act or omission causing common injury, danger, or annoyance to the public or people dwelling or occupying property in the vicinity.
   - Penalized under Section 292 BNS with fine up to Rs. 1,000, and repeated offenses with imprisonment up to 6 months.

2. **Adulteration of Food, Drink, and Drugs (Section 273 & 276 BNS):**
   - Adulterating food or drink intended for sale so as to make it noxious carries imprisonment up to 6 months or fine up to Rs. 5,000.
   - Adulteration of drugs or medicines carries imprisonment up to 1 year and fine.

3. **Rash Driving on Public Ways (Section 281 BNS):**
   - Driving any vehicle on a public way so rashly or negligently as to endanger human life or cause hurt carries imprisonment of up to 6 months, or fine up to Rs. 1,000, or both.

4. **Negligent Conduct with Respect to Machinery or Dangerous Substances (Section 287 BNS):**
   - Failure to take adequate safety precautions in factories, machinery, or fire hazards carries imprisonment up to 6 months and fine."""
            }
        }
        
        for post in posts:
            for cat_key, updated in posts_map.items():
                if cat_key.lower() in post.crime_type.lower() or cat_key.lower() in post.title.lower():
                    post.title = updated["title"]
                    post.crime_type = updated["crime_type"]
                    post.source_sections = updated["source_sections"]
                    post.body = updated["body"].strip()
                    print(f"Updated post: {post.title}")
                    break
                    
        db.commit()
        print("All blog posts successfully standardized!")
    except Exception as e:
        db.rollback()
        print(f"Error standardizing blog posts: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    standardize_all_blog_posts()
