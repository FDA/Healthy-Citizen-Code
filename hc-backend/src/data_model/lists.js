// Data Types
// TODO: instead of enum use list in the schema definition, process definition before feeding to mongoose
// Alerts/enforcements reference: https://open.fda.gov/drug/enforcement/reference/
// Adverse events: https://open.fda.gov/device/event/reference/

var _ = require('lodash');
const alertList = require('./../../lib/countries_list');

var Lists = {
    encounter_discharge_and_admitting_sources: { // http://www.mini-sentinel.org/work_products/Data_Activities/Sentinel_Common-Data-Model.pdf page 13
        'AF': 'Adult Foster Home',
        'AL': 'Assisted Living Facility',
        'AM': 'Ambulatory Visit',
        'AW': 'Emergency Department',
        'EX': 'Expired',
        'HH': 'Home Health',
        'HO': 'Home / Self Care',
        'HS': 'Hospice',
        'IP': 'Other Acute Inpatient Hospital',
        'NH': 'Nursing Home (Includes ICF)',
        'OT': 'Other',
        'RH': 'Rehabilitation Facility',
        'RS': 'Residential Facility',
        'SH': 'Still In Hospital',
        'SN': 'Skilled Nursing Facility',
        'UN': 'Unknown'
    },
    routes_of_administration: { // http://www.fda.gov/Drugs/DevelopmentApprovalProcess/FormsSubmissionRequirements/ElectronicSubmissions/DataStandardsManualmonographs/ucm071667.htm
        "1": {
            "name": "ORAL",
            "short_name": "ORAL",
            "nci_concept_id": "C38288",
            "definition": "Administration to or by way of the mouth."
        },
        "2": {
            "name": "INTRAVENOUS",
            "short_name": "IV",
            "nci_concept_id": "C38276",
            "definition": "Administration within or into a vein or veins."
        },
        "3": {
            "name": "SUBCUTANEOUS",
            "short_name": "SC",
            "nci_concept_id": "C38299",
            "definition": "Administration beneath the skin; hypodermic.� Synonymous with the term SUBDERMAL."
        },
        "4": {
            "name": "INTRAPERITONEAL",
            "short_name": "I-PERITON",
            "nci_concept_id": "C38258",
            "definition": "Administration within the peritoneal cavity."
        },
        "5": {
            "name": "INTRAMUSCULAR",
            "short_name": "IM",
            "nci_concept_id": "C28161",
            "definition": "Administration within a muscle."
        },
        "6": {
            "name": "INTRATHORACIC",
            "short_name": "I-THORAC",
            "nci_concept_id": "C38207",
            "definition": "Administration within the thorax (internal to the ribs); synonymous with the term endothoracic."
        },
        "7": {
            "name": "INTRA-ARTICULAR",
            "short_name": "I-ARTIC",
            "nci_concept_id": "C38223",
            "definition": "Administration within a joint."
        },
        "8": {
            "name": "INTRADERMAL",
            "short_name": "I-DERMAL",
            "nci_concept_id": "C38238",
            "definition": "Administration within the dermis."
        },
        "9": {
            "name": "EPIDURAL",
            "short_name": "EPIDUR",
            "nci_concept_id": "C38210",
            "definition": "Administration upon or over the dura mater."
        },
        "10": {
            "name": "INTRASINAL",
            "short_name": "I-SINAL",
            "nci_concept_id": "C38262",
            "definition": "Administration within the nasal or periorbital sinuses."
        },
        "11": {
            "name": "TOPICAL",
            "short_name": "TOPIC",
            "nci_concept_id": "C38304",
            "definition": "Administration to a particular spot on the outer surface of the body.� The E2B term TRANSMAMMARY is a subset of the term TOPICAL."
        },
        "12": {
            "name": "OPHTHALMIC",
            "short_name": "OPHTHALM",
            "nci_concept_id": "C38287",
            "definition": "Administration� to the external eye."
        },
        "13": {
            "name": "AURICULAR (OTIC)",
            "short_name": "OTIC",
            "nci_concept_id": "C38192",
            "definition": "Administration to or by way of the ear."
        },
        "14": {
            "name": "NASAL",
            "short_name": "NASAL",
            "nci_concept_id": "C38284",
            "definition": "Administration to the nose; administered by way of the nose."
        },
        "15": {
            "name": "VAGINAL",
            "short_name": "VAGIN",
            "nci_concept_id": "C38313",
            "definition": "Administration into the vagina."
        },
        "16": {
            "name": "RECTAL",
            "short_name": "RECTAL",
            "nci_concept_id": "C38295",
            "definition": "Administration to the rectum."
        },
        "17": {
            "name": "URETHRAL",
            "short_name": "URETH",
            "nci_concept_id": "C38271",
            "definition": "Administration into the urethra."
        },
        "19": {
            "name": "INTRASYNOVIAL",
            "short_name": "I-SYNOV",
            "nci_concept_id": "C38264",
            "definition": "Administration within the synovial cavity of a joint."
        },
        "20": {
            "name": "INTRATUMOR",
            "short_name": "I-TUMOR",
            "nci_concept_id": "C38269",
            "definition": "Administration within a tumor."
        },
        "21": {
            "name": "INTRAVASCULAR",
            "short_name": "I-VASC",
            "nci_concept_id": "C38273",
            "definition": "Administration within a vessel or vessels."
        },
        "22": {
            "name": "INTRASPINAL",
            "short_name": "I-SPINAL",
            "nci_concept_id": "C38263",
            "definition": "Administration within the vertebral column."
        },
        "23": {
            "name": "INTRACAVITARY",
            "short_name": "I-CAVIT",
            "nci_concept_id": "C38231",
            "definition": "Administration within a non-pathologic cavity, such as that of the cervix, uterus, or penis, or such as that which is formed as the result of a wound."
        },
        "24": {
            "name": "SUBLINGUAL",
            "short_name": "SL",
            "nci_concept_id": "C38300",
            "definition": "Administration beneath the tongue."
        },
        "25": {
            "name": "INTRABURSAL",
            "short_name": "I-BURSAL",
            "nci_concept_id": "C38226",
            "definition": "Administration within a bursa."
        },
        "27": {
            "name": "INTRACARDIAC",
            "short_name": "I-CARDI",
            "nci_concept_id": "C38227",
            "definition": "Administration with the heart."
        },
        "28": {
            "name": "INTRAUTERINE",
            "short_name": "I-UTER",
            "nci_concept_id": "C38272",
            "definition": "Administration within the uterus."
        },
        "30": {
            "name": "BUCCAL",
            "short_name": "BUCCAL",
            "nci_concept_id": "C38193",
            "definition": "Administration directed toward the cheek, generally from within the mouth."
        },
        "32": {
            "name": "IRRIGATION",
            "short_name": "IRRIG",
            "nci_concept_id": "C38281",
            "definition": "Administration to bathe or flush open wounds or body cavities."
        },
        "34": {
            "name": "RETROBULBAR",
            "short_name": "RETRO",
            "nci_concept_id": "C38296",
            "definition": "Administration behind the pons or behind the eyeball."
        },
        "36": {
            "name": "INTRAOCULAR",
            "short_name": "I-OCUL",
            "nci_concept_id": "C38255",
            "definition": "Administration within the eye."
        },
        "37": {
            "name": "INTRA-ARTERIAL",
            "short_name": "I-ARTER",
            "nci_concept_id": "C38222",
            "definition": "Administration within an artery or arteries."
        },
        "38": {
            "name": "DENTAL",
            "short_name": "DENTAL",
            "nci_concept_id": "C38197",
            "definition": "Administration to a tooth or teeth."
        },
        "40": {
            "name": "PERIODONTAL",
            "short_name": "P-ODONT",
            "nci_concept_id": "C38294",
            "definition": "Administration around a tooth."
        },
        "42": {
            "name": "INTRALESIONAL",
            "short_name": "I-LESION",
            "nci_concept_id": "C38250",
            "definition": "Administration within or introduced directly into a localized lesion."
        },
        "43": {
            "name": "INTRAPLEURAL",
            "short_name": "I-PLEURAL",
            "nci_concept_id": "C38259",
            "definition": "Administration within the pleura."
        },
        "45": {
            "name": "PERIARTICULAR",
            "short_name": "P-ARTIC",
            "nci_concept_id": "C38292",
            "definition": "Administration around a joint."
        },
        "46": {
            "name": "INTRAGASTRIC",
            "short_name": "I-GASTRIC",
            "nci_concept_id": "C38246",
            "definition": "Administration within the stomach."
        },
        "47": {
            "name": "INTRADUODENAL",
            "short_name": "I-DUOD",
            "nci_concept_id": "C38241",
            "definition": "Administration within the duodenum."
        },
        "48": {
            "name": "INTRAVENTRICULAR",
            "short_name": "I-VENTRIC",
            "nci_concept_id": "C38277",
            "definition": "Administration within a ventricle."
        },
        "49": {
            "name": "INTRATENDINOUS",
            "short_name": "I-TENDIN",
            "nci_concept_id": "C38265",
            "definition": "Administration within a tendon."
        },
        "50": {
            "name": "PERIDURAL",
            "short_name": "P-DURAL",
            "nci_concept_id": "C38677",
            "definition": "Administration to the outside of the dura mater of the spinal cord.."
        },
        "52": {
            "name": "INTRADURAL",
            "short_name": "I-DURAL",
            "nci_concept_id": "C38242",
            "definition": "Administration within or beneath the dura."
        },
        "53": {
            "name": "SUBMUCOSAL",
            "short_name": "S-MUCOS",
            "nci_concept_id": "C38301",
            "definition": "Administration beneath the mucous membrane."
        },
        "55": {
            "name": "IONTOPHORESIS",
            "short_name": "ION",
            "nci_concept_id": "C38203",
            "definition": "Administration by means of an electric current where ions of soluble salts migrate into the tissues of the body."
        },
        "56": {
            "name": "INTRA-ABDOMINAL",
            "short_name": "I-ABDOM",
            "nci_concept_id": "C38220",
            "definition": "Administration within the abdomen."
        },
        "57": {
            "name": "EXTRACORPOREAL",
            "short_name": "X-CORPOR",
            "nci_concept_id": "C38212",
            "definition": "Administration outside of the body."
        },
        "60": {
            "name": "INTRA-AMNIOTIC",
            "short_name": "I-AMNI",
            "nci_concept_id": "C38221",
            "definition": "Administration within the amnion."
        },
        "61": {
            "name": "INTRAPROSTATIC",
            "short_name": "I-PROSTAT",
            "nci_concept_id": "C38260",
            "definition": "Administration within the prostate gland."
        },
        "66": {
            "name": "SUBARACHNOID",
            "short_name": "S-ARACH",
            "nci_concept_id": "C38297",
            "definition": "Administration beneath the arachnoid."
        },
        "67": {
            "name": "INTRABRONCHIAL",
            "short_name": "I-BRONCHI",
            "nci_concept_id": "C38225",
            "definition": "Administration within a bronchus."
        },
        "68": {
            "name": "CONJUNCTIVAL",
            "short_name": "CONJUNC",
            "nci_concept_id": "C38194",
            "definition": "Administration to the conjunctiva, the delicate membrane that lines the eyelids and covers the exposed surface of the eyeball."
        },
        "71": {
            "name": "NASOGASTRIC",
            "short_name": "NG",
            "nci_concept_id": "C38285",
            "definition": "Administration through the nose and into the stomach, usually by means of a tube."
        },
        "72": {
            "name": "INTRAESOPHAGEAL",
            "short_name": "I-ESO",
            "nci_concept_id": "C38245",
            "definition": "Administration within the esophagus."
        },
        "88": {
            "name": "INTERSTITIAL",
            "short_name": "INTERSTIT",
            "nci_concept_id": "C38219",
            "definition": "Administration to or in the interstices of a tissue."
        },
        "96": {
            "name": "SUBCONJUNCTIVAL",
            "short_name": "S-CONJUNC",
            "nci_concept_id": "C38298",
            "definition": "Administration beneath the conjunctiva."
        },
        "103": {
            "name": "INTRATHECAL",
            "short_name": "IT",
            "nci_concept_id": "C38267",
            "definition": "Administration within the cerebrospinal fluid at any level of the cerebrospinal axis, including injection into the cerebral ventricles."
        },
        "109": {
            "name": "SOFT TISSUE",
            "short_name": "SOFT TIS",
            "nci_concept_id": "C38198",
            "definition": "Administration into any soft tissue."
        },
        "110": {
            "name": "INTRATESTICULAR",
            "short_name": "I-TESTIC",
            "nci_concept_id": "C38266",
            "definition": "Administration within the testicle."
        },
        "112": {
            "name": "URETERAL",
            "short_name": "URETER",
            "nci_concept_id": "C38312",
            "definition": "Administration into the ureter."
        },
        "113": {
            "name": "PERCUTANEOUS",
            "short_name": "PERCUT",
            "nci_concept_id": "C38676",
            "definition": "Administration through the skin."
        },
        "117": {
            "name": "INTRACORONAL, DENTAL",
            "short_name": "I-CORONAL",
            "nci_concept_id": "C38217",
            "definition": "Administration of a drug within a portion of a tooth which is covered by enamel and which is separated from the roots by a slightly constricted region known as the neck."
        },
        "119": {
            "name": "INTRACORONARY",
            "short_name": "I-CORONARY",
            "nci_concept_id": "C38218",
            "definition": "Administration within the coronary arteries."
        },
        "121": {
            "name": "INTRADISCAL",
            "short_name": "I-DISCAL",
            "nci_concept_id": "C38239",
            "definition": "Administration within a disc."
        },
        "122": {
            "name": "TRANSMUCOSAL",
            "short_name": "T-MUCOS",
            "nci_concept_id": "C38283",
            "definition": "Administration across the mucosa."
        },
        "123": {
            "name": "INTRADUCTAL",
            "short_name": "I-DUCTAL",
            "nci_concept_id": "C38240",
            "definition": "Administration within the duct of a gland."
        },
        "124": {
            "name": "TRANSTYMPANIC",
            "short_name": "T-TYMPAN",
            "nci_concept_id": "C38309",
            "definition": "Administration across or through the tympanic cavity."
        },
        "127": {
            "name": "INTRAEPIDERMAL",
            "short_name": "I-EPIDERM",
            "nci_concept_id": "C38243",
            "definition": "Administration within the epidermis."
        },
        "128": {
            "name": "INTRAVESICAL",
            "short_name": "I-VESIC",
            "nci_concept_id": "C38278",
            "definition": "Administration within the bladder."
        },
        "130": {
            "name": "CUTANEOUS",
            "short_name": "CUTAN",
            "nci_concept_id": "C38675",
            "definition": "Administration to the skin."
        },
        "131": {
            "name": "ENDOCERVICAL",
            "short_name": "E-CERVIC",
            "nci_concept_id": "C38205",
            "definition": "Administration within the canal of the cervix uteri.� Synonymous with the term intracervical.."
        },
        "132": {
            "name": "INTRACAVERNOUS",
            "short_name": "I-CAVERN",
            "nci_concept_id": "C38230",
            "definition": "Administration within a pathologic cavity, such as� occurs in the lung in tuberculosis."
        },
        "133": {
            "name": "ENDOSINUSIAL",
            "short_name": "E-SINUS",
            "nci_concept_id": "C38206",
            "definition": "Administration within the nasal sinuses of the head."
        },
        "134": {
            "name": "OCCLUSIVE DRESSING TECHNIQUE",
            "short_name": "OCCLUS",
            "nci_concept_id": "C38286",
            "definition": "Administration by the topical route which is then covered by a dressing which occludes the area."
        },
        "135": {
            "name": "OTHER",
            "short_name": "OTHER",
            "nci_concept_id": "C38290",
            "definition": "Administration is different from others on this list."
        },
        "136": {
            "name": "RESPIRATORY (INHALATION)",
            "short_name": "RESPIR",
            "nci_concept_id": "C38216",
            "definition": "Administration within the respiratory tract by inhaling orally or nasally for local or systemic effect."
        },
        "137": {
            "name": "INTRAVENOUS DRIP",
            "short_name": "IV DRIP",
            "nci_concept_id": "C38279",
            "definition": "Administration within or into a vein or veins over a sustained period of time."
        },
        "138": {
            "name": "INTRAVENOUS BOLUS",
            "short_name": "IV BOLUS",
            "nci_concept_id": "C38274",
            "definition": "Administration within or into a vein or veins all at once."
        },
        "139": {
            "name": "UNKNOWN",
            "short_name": "UNKNOWN",
            "nci_concept_id": "C38311",
            "definition": "Route of administration is unknown."
        },
        "140": {
            "name": "HEMODIALYSIS",
            "short_name": "HEMO",
            "nci_concept_id": "C38200",
            "definition": "Administration through hemodialysate fluid."
        },
        "307": {
            "name": "INTRAGINGIVAL",
            "short_name": "I-GINGIV",
            "nci_concept_id": "C38247",
            "definition": "Administration within the gingivae."
        },
        "310": {
            "name": "INTRALUMINAL",
            "short_name": "I-LUMIN",
            "nci_concept_id": "C38251",
            "definition": "Administration within the lumen of a tube."
        },
        "311": {
            "name": "INTRAVITREAL",
            "short_name": "I-VITRE",
            "nci_concept_id": "C38280",
            "definition": "Administration within the vitreous body of the eye."
        },
        "312": {
            "name": "NOT APPLICABLE",
            "short_name": "NA",
            "nci_concept_id": "C48623",
            "definition": "Routes of administration are not applicable."
        },
        "313": {
            "name": "ENTERAL",
            "short_name": "ENTER",
            "nci_concept_id": "C38209",
            "definition": "Administration directly into the intestines."
        },
        "314": {
            "name": "INTRAPERICARDIAL",
            "short_name": "I-PERICARD",
            "nci_concept_id": "C38257",
            "definition": "Administration within the pericardium."
        },
        "352": {
            "name": "INTRALYMPHATIC",
            "short_name": "I-LYMPHAT",
            "nci_concept_id": "C38252",
            "definition": "Administration within the lymph."
        },
        "353": {
            "name": "INTRATUBULAR",
            "short_name": "I-TUBUL",
            "nci_concept_id": "C38268",
            "definition": "Administration within the tubules of an organ."
        },
        "354": {
            "name": "INTRAOVARIAN",
            "short_name": "I-OVAR",
            "nci_concept_id": "C38256",
            "definition": "Administration within the ovary."
        },
        "355": {
            "name": "TRANSTRACHEAL",
            "short_name": "T-TRACHE",
            "nci_concept_id": "C38308",
            "definition": "Administration through the wall of the trachea."
        },
        "357": {
            "name": "ELECTRO-OSMOSIS",
            "short_name": "EL-OSMOS",
            "nci_concept_id": "C38633",
            "definition": "Administration of through the diffusion of substance through a membrane in an electric field."
        },
        "358": {
            "name": "TRANSDERMAL",
            "short_name": "T-DERMAL",
            "nci_concept_id": "C38305",
            "definition": "Administration through the dermal layer of the skin to the systemic circulation by diffusion."
        },
        "361": {
            "name": "INFILTRATION",
            "short_name": "INFIL",
            "nci_concept_id": "C38215",
            "definition": "Administration that results in substances passing into tissue spaces or into cells."
        },
        "362": {
            "name": "INTRABILIARY",
            "short_name": "I-BILI",
            "nci_concept_id": "C38224",
            "definition": "Administration within the bile, bile ducts or gallbladder."
        },
        "363": {
            "name": "INTRACARTILAGINOUS",
            "short_name": "I-CARTIL",
            "nci_concept_id": "C38228",
            "definition": "Administration within a cartilage; endochondral."
        },
        "364": {
            "name": "LARYNGEAL",
            "short_name": "LARYN",
            "nci_concept_id": "C38282",
            "definition": "Administration directly upon the larynx."
        },
        "365": {
            "name": "INTRAILEAL",
            "short_name": "I-ILE",
            "nci_concept_id": "C38249",
            "definition": "Administration within the distal portion of the small intestine, from the jejunum to the cecum."
        },
        "366": {
            "name": "INTRATYMPANIC",
            "short_name": "I-TYMPAN",
            "nci_concept_id": "C38270",
            "definition": "Administration within the aurus media."
        },
        "400": {
            "name": "UNASSIGNED",
            "short_name": "UNAS",
            "nci_concept_id": "C38310",
            "definition": "Route of administration has not yet been assigned."
        },
        "401": {
            "name": "ENDOTRACHEAL",
            "short_name": "E-TRACHE",
            "nci_concept_id": "C38208",
            "definition": "Administration directly into the trachea."
        },
        "402": {
            "name": "EXTRA?AMNIOTIC",
            "short_name": "X-AMNI",
            "nci_concept_id": "C38211",
            "definition": "Administration to the outside of the membrane enveloping the fetus"
        },
        "403": {
            "name": "INTRACORPORUS CAVERNOSUM",
            "short_name": "I-CORPOR",
            "nci_concept_id": "C38235",
            "definition": "Administration within the dilatable spaces of the corporus cavernosa of the penis."
        },
        "404": {
            "name": "INTRACEREBRAL",
            "short_name": "I-CERE",
            "nci_concept_id": "C38232",
            "definition": "Administration within the cerebrum."
        },
        "405": {
            "name": "INTRACISTERNAL",
            "short_name": "I-CISTERN",
            "nci_concept_id": "C38233",
            "definition": "Administration within the cisterna magna cerebellomedularis."
        },
        "406": {
            "name": "INTRACORNEAL",
            "short_name": "I-CORNE",
            "nci_concept_id": "C38234",
            "definition": "Administration within the cornea (the transparent structure forming the anterior part of the fibrous tunic of the eye)."
        },
        "408": {
            "name": "INTRAMEDULLARY",
            "short_name": "I-MEDUL",
            "nci_concept_id": "C38253",
            "definition": "Administration within the marrow cavity of a bone."
        },
        "409": {
            "name": "INTRAMENINGEAL",
            "short_name": "I-MENIN",
            "nci_concept_id": "C38254",
            "definition": "Administration within the meninges (the three membranes that envelope the brain and spinal cord)."
        },
        "410": {
            "name": "OROPHARYNGEAL",
            "short_name": "ORO",
            "nci_concept_id": "C38289",
            "definition": "Administration directly to the mouth and pharynx."
        },
        "411": {
            "name": "PARENTERAL",
            "short_name": "PAREN",
            "nci_concept_id": "C38291",
            "definition": "Administration by injection, infusion, or implantation."
        },
        "412": {
            "name": "PERINEURAL",
            "short_name": "P-NEURAL",
            "nci_concept_id": "C38293",
            "definition": "Administration surrounding a nerve or nerves."
        },
        "413": {
            "name": "INTRACAUDAL",
            "short_name": "I-CAUDAL",
            "nci_concept_id": "C38229",
            "definition": "Administration within the cauda equina."
        },
        "414": {
            "name": "INTRAPULMONARY",
            "short_name": "I-PULMON",
            "nci_concept_id": "C38261",
            "definition": "Administration within the lungs or its bronchi."
        },
        "415": {
            "name": "TRANSPLACENTAL",
            "short_name": "T-PLACENT",
            "nci_concept_id": "C38307",
            "definition": "Administration through or across the placenta."
        },
        "FDA CODE": {
            "name": "NAME",
            "short_name": "SHORT NAME",
            "nci_concept_id": "NCI CONCEPT ID",
            "definition": "DEFINITION"
        }
    },
    units: {
        'G': 'grams ',
        'MG': 'milligrams',
        'L': 'liters',
        'ML': 'milliters'
    },
    product_type: {
        'MED': 'Prescription Medication',
        'OTC': 'Over the Counter Medication',
        'Biologic': 'Biologic ',
        'Device': 'Medical Device'
    },
    encounter_types: {
        'AV': 'Ambulatory Visit',
        'ED': 'Emergency Department',
        'IP': 'Inpatient Hospital Stay',
        'IS': 'Non-Acute Institutional Stay',
        'OA': 'Other Ambulatory Visit',
        'HO': 'Home', // added by JP
        'EP': 'Ephemeral', // added by JP/AM. Means that this encounter is not linked to a real encounter ID. added by Eugene: not found that value in FHIR documentation
        'DT': 'Daytime',   // Daytime An encounter where the patient needs more prolonged treatment or investigations than outpatients, but who do not need to stay in the hospital overnight.
        'VR': 'Virtual',   // Virtual An encounter that takes place where the patient and practitioner do not physically meet but use electronic means for contact.
        'FD': 'Field'
    },
    discharge_dispositions: {
        'A': 'Discharged alive',
        'E': 'Expired',
        'U': 'Uknown'
    },
    diagnosis_related_group_types: {
        'N': 'New',
        'O': 'Old'
    },
    tri_state: {
        'Y': 'Yes',
        'N': 'No',
        'U': 'Unknown'
    },
    two_state: {
        'Y': 'Yes',
        'N': 'No'
    },
    genders: {
        'M': 'Male',
        'F': 'Female',
        'A': 'Ambiguous',
        'T': 'Trans-gender',
        'U': 'Unknown'
    },
    geographic_region: {
        'NE': 'Northeast',
        'SW': 'Southwest',
        'MW': 'Midwest',
        'SW': 'Southwest',
        'NW': 'Northwest'
    },
    races: {
        '0': 'Unknown',
        '1': 'American Indian or Alaska Native',
        '2': 'Asian',
        '3': 'Black or African American',
        '4': 'Native Hawaiian or Other Pacific Islander',
        '5': 'White'
    },

    diagnosis_code_types: {
        '09': 'ICD-9-CM',
        '10': 'ICD-10-CM',
        '11': 'ICD-11-CM',
        'SM': 'SNOMED CT',
        'OT': 'Other'
    },

    principal_discharge_diagnosis_flags: {
        'P': 'Principal',
        'S': 'Secondary',
        'X': 'Unable to Classify'
    },

    procedure_code_types: {
        '09': 'ICD-9-CM',
        '10': 'ICD-10-CM',
        '11': 'ICD-11-CM',                          // not in vax
        'C2': 'CPT Category II',                    // not in vax
        'C3': 'CPT Category III',                   // not in vax
        'C4': 'CPT-4 (i.e., HCPCS Level I) ',
        'H3': 'HCPCS Level III',
        'HC': 'HCPCS (i.e., HCPCS Level II) ',
        'LC': 'LOINC',                              // not in lab, vax
        'LO': 'Local homegrown',
        'ND': 'NDC',                                // not in lab, vax
        'OT': 'Other',
        'VX': 'CVX',                                // only in vax
        'RE': 'Revenue'
    },
    date_imputed_types: {
        'B': 'Both month and day imputed',
        'D': 'Day imputed',
        'M': 'Month imputed',
        'N': 'Not imputed'
    },
    death_confidence_types: {
        'E': 'Excellent',
        'F': 'Fair',
        'P': 'Poor'
    },
    death_source_types: {
        'L': 'Other, locally defined',
        'N': 'National Death Index',
        'S': 'State Death files',
        'T': 'Tumor data'
    },
    cause_of_death_code_types: {
        'C': 'Contributory',
        'I': 'Immediate/Primary O = Other',
        'U': 'Underlying'
    },
    death_sources: {
        'L': 'Other, locally defined',
        'N': 'National Death Index',
        'S': 'State Death files',
        'T': 'Tumor data'
    },
    test_names: {
        'ALP': 'alkaline phosphatase',
        'ALT': 'alanine aminotransferase',
        'ANC': 'absolute neutrophil count',
        'BILI_TOT': 'total bilirubin',
        'CHOL_HDL': 'cholesterol high density lipoprotein',
        'CHOL_LDL': 'cholesterol low density lipoprotein',
        'CHOL_TOT': 'cholesterol total',
        'CK': 'creatine kinase total',
        'CK_MB': 'creatine kinase MB',
        'CK_MBI': 'creatine kinase MB/creatine kinase total',
        'CREATININE': 'creatinine',
        'D_DIMER': 'd-dimer',
        'GLUCOSE': 'glucose',
        'HGB': 'hemoglobin',
        'HGBA1C': 'glycosylated hemoglobin',
        'INF_A': 'influenza virus A',
        'INF_AB': 'influenza virus A + B',
        'INF_B': 'influenza virus B',
        'INF_NS': 'influenza virus not specified',
        'INR': 'international normalized ratio',
        'LIPASE': 'lipase',
        'PG': 'pregnancy test',
        'PLATELETS': 'platelet count',
        'SODIUM': 'sodium',
        'TRIG': 'triglycerides',
        'TROP_I': 'troponin I cardiac',
        'TROP_T': 'troponin T cardiac',
        'TSH': 'thyroid stimulating hormone'
    },
    result_types: {
        'N': 'Numeric',
        'C': 'Character'
    },
    test_sub_categories: {
        'BHCG': 'beta human choriogonadotropin CLC = calculated',
        'CLC': 'Calculated',
        'DDU': 'd-dimer units',
        'DIRECT': 'direct',
        'EIA': 'enzyme immunoassay',
        'FEU': 'fibrinogen equivalent units HCG = human choriogonadotropin',
        'IF': 'immunofluorescence',
        'NS': 'not specified',
        'PCR': 'probe and target amplification VTC = organism-specific culture'
    },
    fasting_indicators: {
        'F': 'fasting',
        'R': 'random',
        'X': 'not applicable'
    },
    specimen_sources: {
        'BAL': 'bronchoalveolar lavage BALBX = bronchoalveolar biopsy BLOOD = blood',
        'CSF': 'cerebrospinal fluid',
        'NPH': 'nasopharyngeal swab',
        'NPWASH': 'nasopharyngeal wash NSWAB = nasal swab or nose specimen NWASH = nasal wash',
        'OTHER': 'other',
        'PLASMA': 'plasma',
        'PPP': 'platelet poor plasma',
        'SERUM': 'serum',
        'SPUTUM': 'sputum',
        'SR_PLS': 'serum/plasma',
        'THRT': 'throat swab, oropharyngeal swab UNK = unknown or null',
        'URINE': 'urine'
    },
    test_immediacy_types: {
        'E': 'Expedite',
        'R': 'Routine',
        'S': 'Stat',
        'U': 'Unknown or null'
    },
    patient_location_types: {
        'E': 'Emergency department H = Home',
        'I': 'Inpatient',
        'O': 'Outpatient',
        'U': 'Unknown or null',
        'H': 'Home' // added by JP
    },
    result_location_types: {
        'L': 'Lab',
        'P': 'Point of Care',
        'H': 'Home' // added by JP
    },

    standardized_character_result_value_types: {
        'BORDERLINE': 'Borderline',
        'NEGATIVE': 'Negative',
        'POSITIVE': 'Positive',
        'UNDETERMINED': 'Undetermined',
        'RANGE': 'Range: start |end unit'
    },
    lab_test_modifiers: {
        'EQ': 'equal',
        'GE': 'greater than or equal to',
        'GT': 'greater than',
        'LE': 'less than or equal to',
        'LT': 'less than',
        'TX': 'text'
    },
    lab_test_low_modifiers: {
        'EQ': 'equal',
        'GE': 'greater than or equal to',
        'GT': 'greater than'
    },
    lab_test_high_modifiers: {
        'EQ': 'equal',
        'LE': 'less than or equal to',
        'LT': 'less than'
    },
    abnormal_result_indicators: {
        'AB': 'abnormal',
        'AH': 'abnormally high',
        'AL': 'abnormally low',
        'CH': 'critically high',
        'CL': 'critically low',
        'CR': 'critical',
        'IN': 'inconclusive',
        'NL': 'normal',
        'UN': 'unknown'
    },
    blood_pressure_types: {
        'E': 'Extended',
        'M': 'Multiple',
        'O': 'Orthostatic',
        'R': 'Rooming'
    },
    blood_test_position_types: {
        '1': 'Sitting',
        '2': 'Standing',
        '3': 'Supine'
    },
    tobacco_statuses: {
        '1': 'Current user',
        '2': 'Never',
        '3': 'Quit/former user',
        '4': 'Passive',
        '5': 'Environmental exposure',
        '6': 'Not asked',
        '7': 'Conflicting'
    },
    tobacco_type: {
        '1': 'Cigarettes only',
        '2': 'Other tobacco only',
        '3': 'Cigarettes and other tobacco ',
        '4': 'None'
    },
    iis_list: {
        "AL": "Alabama",
        "AK": "Alaska",
        "AS": "American Samoa",
        "AZ": "Arizona",
        "AR": "Arkansas",
        "CA": "California",
        "CO": "Colorado",
        "CT": "Connecticut",
        "DE": "Delaware",
        "DC": "District Of Columbia",
        "FM": "Federated States Of Micronesia",
        "FL": "Florida",
        "GA": "Georgia",
        "GU": "Guam",
        "HI": "Hawaii",
        "ID": "Idaho",
        "IL": "Illinois",
        "IN": "Indiana",
        "IA": "Iowa",
        "KS": "Kansas",
        "KY": "Kentucky",
        "LA": "Louisiana",
        "ME": "Maine",
        "MH": "Marshall Islands",
        "MD": "Maryland",
        "MA": "Massachusetts",
        "MI": "Michigan",
        "MN": "Minnesota",
        "MS": "Mississippi",
        "MO": "Missouri",
        "MT": "Montana",
        "NE": "Nebraska",
        "NV": "Nevada",
        "NH": "New Hampshire",
        "NJ": "New Jersey",
        "NM": "New Mexico",
        "NY": "New York",
        "NC": "North Carolina",
        "ND": "North Dakota",
        "MP": "Northern Mariana Islands",
        "OH": "Ohio",
        "OK": "Oklahoma",
        "OR": "Oregon",
        "PW": "Palau",
        "PA": "Pennsylvania",
        "PR": "Puerto Rico",
        "RI": "Rhode Island",
        "SC": "South Carolina",
        "SD": "South Dakota",
        "TN": "Tennessee",
        "TX": "Texas",
        "UT": "Utah",
        "VT": "Vermont",
        "VI": "Virgin Islands",
        "VA": "Virginia",
        "WA": "Washington",
        "WV": "West Virginia",
        "WI": "Wisconsin",
        "WY": "Wyoming"
    },
    vaccination_administration_type: {
        'IP': 'Inpatient Hospital Stay',
        'ED': 'Emergency Department',
        'AV': 'Ambulatory Visit',
        'IS': 'InstitutionalStay',
        'SC': 'School',
        'CC': 'Child Care',
        'FP': 'Family Planning',
        'PH': 'Pharmacy',
        'HD': 'Health department',
        'EM': 'Employer clinic',
        'MC': 'Mass clinic',
        'NA': 'Not applicable',
        'OT': 'Other',
        'UN': 'Unknown'
    },
    citizen_conditions: {
        // To be completed in HC-33, HC-34, HC-35 as a separate deliverable for synthetic patients generator
    },
    source_types: {
        'M': 'Manual Entry',
        'D': 'Information from a device'
    },
    alerts_issuers: {
        'FDA': 'U.S. Food and Drug Administration'
    },
    voluntary_mandated: {
        voluntary: "Voluntary",
        voluntary_firm_initiated: "Voluntary: Firm Initiated",
        mandated: "Mandated",
        other: "Other"
    },
    alerts_types: {
        "recall": "Recall"
    },
    medication_frequency: {
        '1PD'  : 'one time per day',
        '2PD'  : 'two times per day',
        '3PD'  : 'three times per day',
        '4PD'  : 'four times per day',
        '1PH'  : 'every 1 hour',
        '2PH'  : 'every 2 hours',
        '3PH'  : 'every 3 hours',
        '4PH'  : 'every 4 hours',
        '6PH'  : 'every 6 hours',
        '8PH'  : 'every 8 hours',
        '12PH' : 'every 12 hours'
    },
    loinc_codes: {
        "ALP": '32135-6',
        "ALT": '1743-4',
        "BILI_TOT": '1975-2',
        "CHOL_HDL": '2085-9',
        "CHOL_LDL": '2090-9',
        "CHOL_TOT": '74435-9',
        "CK": '72561-4',
        "CK_MB": '2154-3',
        "CK_MBI": '12189-7',
        "CREATININE": '14682-9',
        "GLUCOSE": '14749-6',
        "HGBA1C": '41995-2',
    },
    primary_source_qualifications: {
        "1": "Physician",
        "2": "Pharmacist",
        "3": "Other health professional",
        "4": "Lawyer",
        "5": "Consumer or non-health professional"
    },
    medical_speciality: {
        "AN": "Anesthesiology",
        "CV": "Cardiovascular",
        "CH": "Clinical Chemistry",
        "DE": "Dental",
        "EN": "Ear, Nose, Throat",
        "GU": "Gastroenterology, Urology",
        "HO": "General Hospital",
        "HE": "Hematology",
        "IM": "Immunology",
        "MI": "Microbiology",
        "NE": "Neurology",
        "OB": "Obstetrics/Gynecology",
        "OP": "Ophthalmic",
        "OR": "Orthopedic",
        "PA": "Pathology",
        "PM": "Physical Medicine",
        "RA": "Radiology",
        "SU": "General, Plastic Surgery",
        "TX": "Clinical Toxicology"
    },
    device_classes: {
        "1": "Class I (low to moderate risk): general controls",
        "2": "Class II (moderate to high risk): general controls and special controls",
        "3": "Class III (high risk): general controls and Premarket Approval (PMA)",
        "U": "Unclassified",
        "N": "Not classified",
        "F": "HDE"
    },
    unclassified_reasons: {
        "1": "Pre-Amendment",
        "2": "IDE",
        "3": "For Export Only",
        "4": "Unknown",
        "5": "Guidance Under Development",
        "6": "Enforcement Discretion",
        "7": "Not FDA Regulated"
    },
    loinc_codes_names: {
        "ALP": 'alkaline phosphatase',
        "ALT": 'alanine aminotransferase',
        "BILI_TOT": 'total bilirubin',
        "CHOL_HDL": 'cholesterol high density lipoprotein',
        "CHOL_LDL": 'cholesterol low density lipoprotein',
        "CHOL_TOT": 'cholesterol total',
        "CK": 'creatine kinase total',
        "CK_MB": 'creatine kinase MB',
        "CK_MBI": 'creatine kinase MB/creatine kinase total',
        "CREATININE": 'creatinine',
        "GLUCOSE": 'glucose',
        "HGBA1C": 'glycosylated hemoglobin'

    },
    product_types_list: {
        "MD": "Medical devices",
        "ME": "Medications"
    }
};

Lists.encounters_admitting_source = _.omit(Lists.encounter_discharge_and_admitting_sources, ['EX']);
Lists.encounters_procedure_code_types = _.omit(Lists.procedure_code_types, ['VX']);
Lists.encounters_labtests_procedure_code_types = _.omit(Lists.procedure_code_types, ['ND', 'VX']);
Lists.encounters_vaccines_vaccination_code_types = _.omit(Lists.procedure_code_types, ['11', 'C2', 'C3', 'LC', 'ND']);

// saved lists from remote sources
Lists.alert_item_country = alertList;

module.exports = Lists;
