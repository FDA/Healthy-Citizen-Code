// Copied here from backend-v3 response for convenience
const newSchema = {
  "adverseEvents": {
    "type": "Schema",
    "fullName": "Adverse Events",
    "limitReturnedRecords": 50,
    "serverSide": true,
    "requiresAuthentication": true,
    "description": "Contains adverse Events pulled from various sources",
    "fields": {
      "rawData": {
        "type": "Mixed",
        "visible": false,
        "fullName": "Raw Data",
        "description": "Contains the pulled data as-is for future reparsing",
        "visibilityPriority": 100,
        "width": 100
      },
      "processed": {
        "type": "Boolean",
        "visible": false,
        "index": true,
        "fullName": "Processed",
        "description": "If true then the record was already processed, otherwise rawData needs to be processed to produce the rest of the records fields",
        "width": 20,
        "visibilityPriority": 100
      },
      "key": {
        "type": "String",
        "visible": false,
        "unique": true,
        "fullName": "Key",
        "description": "Unique key identifying each record to prevent duplicates. This is different from _id as it is based on the record contents",
        "width": 150,
        "searchable": true,
        "transform": [
          "trim"
        ],
        "visibilityPriority": 100
      },
      "source": {
        "type": "String",
        "visible": false,
        "index": true,
        "list": "dataSources",
        "fullName": "Source",
        "description": "Data source as specified in dataPulls or (in the future) in 0_data_sources.json",
        "width": 150,
        "searchable": true,
        "transform": [
          "trim"
        ],
        "visibilityPriority": 100
      },
      "subject": {
        "type": "String",
        "searchable": true,
        "index": true,
        "fullName": "Subject",
        "description": "Short description of the adverse event.",
        "width": 150,
        "transform": [
          "trim"
        ],
        "visible": true,
        "visibilityPriority": 100
      },
      "details": {
        "type": "String",
        "searchable": true,
        "index": true,
        "fullName": "Description",
        "description": "Adverse event details.",
        "width": 150,
        "transform": [
          "trim"
        ],
        "visible": true,
        "visibilityPriority": 100
      },
      "ndcs": {
        "type": "String[]",
        "visible": false,
        "fullName": "NDC",
        "description": "National Drug Code",
        "visibilityPriority": 100,
        "width": 100
      },
      "kNumbers": {
        "type": "String[]",
        "visible": false,
        "fullName": "K Numbers",
        "description": "K Number",
        "visibilityPriority": 100,
        "width": 100
      },
      "date": {
        "type": "Date",
        "index": true,
        "fullName": "Posted Date",
        "description": "The date when the alert was posted",
        "width": 85,
        "visible": true,
        "visibilityPriority": 100
      },
      "generatorBatchNumber": {
        "type": "String",
        "visible": false,
        "generated": true,
        "fullName": "Generator Batch Number",
        "description": "Set to the ID of generator batch for synthetic records"
      }
    },
    "defaultSortBy": {
      "_id": -1
    }
  },
  "productsBiologics": {
    "type": "Schema",
    "fullName": "Biologic Products",
    "limitReturnedRecords": 30,
    "serverSide": true,
    "requiresAuthentication": true,
    "description": "Global catalog of biologic products supported by the system",
    "fields": {
      "rawData": {
        "type": "Mixed",
        "visible": false,
        "fullName": "Raw Data",
        "description": "Contains the pulled data as-is for future reparsing",
        "visibilityPriority": 100,
        "width": 100
      },
      "processed": {
        "type": "Boolean",
        "visible": false,
        "index": true,
        "fullName": "Processed",
        "description": "If true then the record was already processed, otherwise rawData needs to be processed to produce the rest of the records fields",
        "width": 20,
        "visibilityPriority": 100
      },
      "key": {
        "type": "String",
        "visible": false,
        "unique": true,
        "fullName": "Key",
        "description": "Unique key identifying each record to prevent duplicates. This is different from _id as it is based on the record contents",
        "width": 150,
        "searchable": true,
        "transform": [
          "trim"
        ],
        "visibilityPriority": 100
      },
      "source": {
        "type": "String",
        "visible": false,
        "index": true,
        "list": "dataSources",
        "fullName": "Source",
        "description": "Data source as specified in dataPulls or (in the future) in 0_data_sources.json",
        "width": 150,
        "searchable": true,
        "transform": [
          "trim"
        ],
        "visibilityPriority": 100
      },
      "ndc": {
        "type": "String",
        "searchable": true,
        "index": true,
        "fullName": "NDC Number",
        "description": "Product NDC Number",
        "width": 150,
        "transform": [
          "trim"
        ],
        "visible": true,
        "visibilityPriority": 100
      },
      "name": {
        "type": "String",
        "searchable": true,
        "index": true,
        "fullName": "Name",
        "description": "Product name",
        "width": 150,
        "transform": [
          "trim"
        ],
        "visible": true,
        "visibilityPriority": 100
      },
      "dosageForm": {
        "type": "String",
        "index": true,
        "fullName": "Dosage Form",
        "description": "Dosage form of the product",
        "width": 150,
        "searchable": true,
        "transform": [
          "trim"
        ],
        "visible": true,
        "visibilityPriority": 100
      },
      "category": {
        "type": "String",
        "searchable": false,
        "visible": false,
        "index": true,
        "fullName": "Category",
        "description": "Category of the product",
        "width": 150,
        "transform": [
          "trim"
        ],
        "visibilityPriority": 100
      },
      "applicationNumber": {
        "type": "String",
        "searchable": true,
        "index": true,
        "fullName": "Application Number",
        "description": "Application Number of the product",
        "width": 150,
        "transform": [
          "trim"
        ],
        "visible": true,
        "visibilityPriority": 100
      },
      "productType": {
        "type": "String",
        "index": true,
        "fullName": "Product Type",
        "description": "Product Type",
        "width": 150,
        "searchable": true,
        "transform": [
          "trim"
        ],
        "visible": true,
        "visibilityPriority": 100
      },
      "generatorBatchNumber": {
        "type": "String",
        "visible": false,
        "generated": true,
        "fullName": "Generator Batch Number",
        "description": "Set to the ID of generator batch for synthetic records"
      }
    },
    "defaultSortBy": {
      "_id": -1
    }
  },
  "productsDevices": {
    "type": "Schema",
    "fullName": "Medical Devices",
    "limitReturnedRecords": 30,
    "serverSide": true,
    "requiresAuthentication": true,
    "description": "Global catalog of devices supported by the system",
    "fields": {
      "rawData": {
        "type": "Mixed",
        "visible": false,
        "fullName": "Raw Data",
        "description": "Contains the pulled data as-is for future reparsing",
        "visibilityPriority": 100,
        "width": 100
      },
      "processed": {
        "type": "Boolean",
        "visible": false,
        "index": true,
        "fullName": "Processed",
        "description": "If true then the record was already processed, otherwise rawData needs to be processed to produce the rest of the records fields",
        "width": 20,
        "visibilityPriority": 100
      },
      "key": {
        "type": "String",
        "visible": false,
        "unique": true,
        "fullName": "Key",
        "description": "Unique key identifying each record to prevent duplicates. This is different from _id as it is based on the record contents",
        "width": 150,
        "searchable": true,
        "transform": [
          "trim"
        ],
        "visibilityPriority": 100
      },
      "source": {
        "type": "String",
        "visible": false,
        "index": true,
        "list": "dataSources",
        "fullName": "Source",
        "description": "Data source as specified in dataPulls or (in the future) in 0_data_sources.json",
        "width": 150,
        "searchable": true,
        "transform": [
          "trim"
        ],
        "visibilityPriority": 100
      },
      "name": {
        "type": "String",
        "searchable": true,
        "index": true,
        "fullName": "Name",
        "description": "Product name",
        "width": 150,
        "transform": [
          "trim"
        ],
        "visible": true,
        "visibilityPriority": 100
      },
      "description": {
        "type": "String",
        "searchable": false,
        "index": true,
        "fullName": "Description",
        "description": "Description of the product",
        "width": 150,
        "transform": [
          "trim"
        ],
        "visible": true,
        "visibilityPriority": 100
      },
      "registrationNumber": {
        "type": "String",
        "searchable": true,
        "index": true,
        "fullName": "Registration Number",
        "description": "Registration Number",
        "width": 150,
        "transform": [
          "trim"
        ],
        "visible": true,
        "visibilityPriority": 100
      },
      "kNumber": {
        "type": "String",
        "searchable": true,
        "index": true,
        "fullName": "K Number",
        "description": "K Number",
        "width": 150,
        "transform": [
          "trim"
        ],
        "visible": true,
        "visibilityPriority": 100
      },
      "adverseEvents": {
        "type": "ObjectID[]",
        "fullName": "Adverse Events",
        "visible": false,
        "lookup": {
          "table": "adverseEvents",
          "foreignKey": "_id",
          "label": "subject",
          "id": "adverseEvents"
        },
        "transform": [
          [
            "addLookupDetails",
            null
          ]
        ],
        "visibilityPriority": 100,
        "width": 100
      },
      "recalls": {
        "type": "ObjectID[]",
        "fullName": "Recalls",
        "visible": false,
        "lookup": {
          "table": "recalls",
          "foreignKey": "_id",
          "label": "subject",
          "id": "recalls"
        },
        "transform": [
          [
            "addLookupDetails",
            null
          ]
        ],
        "visibilityPriority": 100,
        "width": 100
      },
      "generatorBatchNumber": {
        "type": "String",
        "visible": false,
        "generated": true,
        "fullName": "Generator Batch Number",
        "description": "Set to the ID of generator batch for synthetic records"
      }
    },
    "defaultSortBy": {
      "_id": -1
    }
  },
  "productsMedications": {
    "type": "Schema",
    "fullName": "Medication Products",
    "limitReturnedRecords": 30,
    "serverSide": true,
    "requiresAuthentication": true,
    "description": "Global catalog of medications supported by the system",
    "fields": {
      "rawData": {
        "type": "Mixed",
        "visible": false,
        "fullName": "Raw Data",
        "description": "Contains the pulled data as-is for future reparsing",
        "visibilityPriority": 100,
        "width": 100
      },
      "processed": {
        "type": "Boolean",
        "visible": false,
        "index": true,
        "fullName": "Processed",
        "description": "If true then the record was already processed, otherwise rawData needs to be processed to produce the rest of the records fields",
        "width": 20,
        "visibilityPriority": 100
      },
      "key": {
        "type": "String",
        "visible": false,
        "unique": true,
        "fullName": "Key",
        "description": "Unique key identifying each record to prevent duplicates. This is different from _id as it is based on the record contents",
        "width": 150,
        "searchable": true,
        "transform": [
          "trim"
        ],
        "visibilityPriority": 100
      },
      "source": {
        "type": "String",
        "visible": false,
        "index": true,
        "list": "dataSources",
        "fullName": "Source",
        "description": "Data source as specified in dataPulls or (in the future) in 0_data_sources.json",
        "width": 150,
        "searchable": true,
        "transform": [
          "trim"
        ],
        "visibilityPriority": 100
      },
      "name": {
        "type": "String",
        "searchable": true,
        "index": true,
        "fullName": "Name",
        "description": "Product name",
        "width": 150,
        "transform": [
          "trim"
        ],
        "visible": true,
        "visibilityPriority": 100
      },
      "description": {
        "type": "String",
        "searchable": false,
        "index": true,
        "fullName": "Description",
        "description": "Description of the product",
        "width": 150,
        "transform": [
          "trim"
        ],
        "visible": true,
        "visibilityPriority": 100
      },
      "ndc": {
        "type": "String",
        "searchable": true,
        "index": true,
        "fullName": "NDC",
        "description": "National Drug Code",
        "width": 150,
        "transform": [
          "trim"
        ],
        "visible": true,
        "visibilityPriority": 100
      },
      "adverseEvents": {
        "type": "ObjectID[]",
        "fullName": "Adverse Events",
        "visible": false,
        "lookup": {
          "table": "adverseEvents",
          "foreignKey": "_id",
          "label": "subject",
          "id": "adverseEvents"
        },
        "transform": [
          [
            "addLookupDetails",
            null
          ]
        ],
        "visibilityPriority": 100,
        "width": 100
      },
      "recalls": {
        "type": "ObjectID[]",
        "fullName": "Recalls",
        "visible": false,
        "lookup": {
          "table": "recalls",
          "foreignKey": "_id",
          "label": "subject",
          "id": "recalls"
        },
        "transform": [
          [
            "addLookupDetails",
            null
          ]
        ],
        "visibilityPriority": 100,
        "width": 100
      },
      "generatorBatchNumber": {
        "type": "String",
        "visible": false,
        "generated": true,
        "fullName": "Generator Batch Number",
        "description": "Set to the ID of generator batch for synthetic records"
      }
    },
    "defaultSortBy": {
      "_id": -1
    }
  },
  "productsSupplements": {
    "type": "Schema",
    "fullName": "Supplement Products",
    "limitReturnedRecords": 30,
    "serverSide": true,
    "requiresAuthentication": true,
    "description": "Global catalog of supplements supported by the system",
    "fields": {
      "rawData": {
        "type": "Mixed",
        "visible": false,
        "fullName": "Raw Data",
        "description": "Contains the pulled data as-is for future reparsing",
        "visibilityPriority": 100,
        "width": 100
      },
      "processed": {
        "type": "Boolean",
        "visible": false,
        "index": true,
        "fullName": "Processed",
        "description": "If true then the record was already processed, otherwise rawData needs to be processed to produce the rest of the records fields",
        "width": 20,
        "visibilityPriority": 100
      },
      "key": {
        "type": "String",
        "visible": false,
        "unique": true,
        "fullName": "Key",
        "description": "Unique key identifying each record to prevent duplicates. This is different from _id as it is based on the record contents",
        "width": 150,
        "searchable": true,
        "transform": [
          "trim"
        ],
        "visibilityPriority": 100
      },
      "source": {
        "type": "String",
        "visible": false,
        "index": true,
        "list": "dataSources",
        "fullName": "Source",
        "description": "Data source as specified in dataPulls or (in the future) in 0_data_sources.json",
        "width": 150,
        "searchable": true,
        "transform": [
          "trim"
        ],
        "visibilityPriority": 100
      },
      "name": {
        "type": "String",
        "searchable": true,
        "index": true,
        "fullName": "Product Name",
        "description": "supplement labelled as name",
        "width": 150,
        "transform": [
          "trim"
        ],
        "visible": true,
        "visibilityPriority": 100
      },
      "firmName": {
        "type": "String",
        "searchable": true,
        "index": true,
        "fullName": "Firm Name",
        "description": "Manufacturing firm",
        "width": 150,
        "transform": [
          "trim"
        ],
        "visible": true,
        "visibilityPriority": 100
      },
      "dsldId": {
        "type": "String",
        "searchable": true,
        "index": true,
        "fullName": "DSLD ID",
        "description": "Supplement ID",
        "width": 150,
        "transform": [
          "trim"
        ],
        "visible": true,
        "visibilityPriority": 100
      },
      "contentAmount": {
        "type": "String",
        "searchable": false,
        "index": true,
        "fullName": "Container Amount",
        "description": "Amount of product in container",
        "width": 150,
        "transform": [
          "trim"
        ],
        "visible": true,
        "visibilityPriority": 100
      },
      "contentUnits": {
        "type": "String",
        "searchable": false,
        "index": true,
        "fullName": "Units of amount",
        "description": "Units for amount in container",
        "width": 150,
        "transform": [
          "trim"
        ],
        "visible": true,
        "visibilityPriority": 100
      },
      "servingAmount": {
        "type": "String",
        "searchable": false,
        "index": true,
        "fullName": "Serving Size",
        "description": "Single serving amount",
        "width": 150,
        "transform": [
          "trim"
        ],
        "visible": true,
        "visibilityPriority": 100
      },
      "servingUnits": {
        "type": "String",
        "searchable": false,
        "index": true,
        "fullName": "Serving Units",
        "description": "Units for serving",
        "width": 150,
        "transform": [
          "trim"
        ],
        "visible": true,
        "visibilityPriority": 100
      },
      "type": {
        "type": "String",
        "searchable": false,
        "index": true,
        "fullName": "Supplement Type",
        "description": "Type of supplement",
        "width": 150,
        "transform": [
          "trim"
        ],
        "visible": true,
        "visibilityPriority": 100
      },
      "form": {
        "type": "String",
        "searchable": false,
        "index": true,
        "fullName": "Form of Product",
        "description": "The form the product is delivered in.",
        "width": 150,
        "transform": [
          "trim"
        ],
        "visible": true,
        "visibilityPriority": 100
      },
      "uses": {
        "type": "String",
        "searchable": false,
        "index": true,
        "fullName": "Claims and Uses",
        "description": "What the manufacturer claims as uses",
        "width": 150,
        "transform": [
          "trim"
        ],
        "visible": true,
        "visibilityPriority": 100
      },
      "targetGroups": {
        "type": "String",
        "searchable": false,
        "index": true,
        "fullName": "Target Groups",
        "description": "Recommended groups for this supplement",
        "width": 150,
        "transform": [
          "trim"
        ],
        "visible": true,
        "visibilityPriority": 100
      },
      "generatorBatchNumber": {
        "type": "String",
        "visible": false,
        "generated": true,
        "fullName": "Generator Batch Number",
        "description": "Set to the ID of generator batch for synthetic records"
      }
    },
    "defaultSortBy": {
      "_id": -1
    }
  },
  "productsTobaccos": {
    "type": "Schema",
    "fullName": "Tobacco Products",
    "limitReturnedRecords": 30,
    "serverSide": true,
    "requiresAuthentication": true,
    "description": "Global catalog of tobacco products supported by the system",
    "fields": {
      "rawData": {
        "type": "Mixed",
        "visible": false,
        "fullName": "Raw Data",
        "description": "Contains the pulled data as-is for future reparsing",
        "visibilityPriority": 100,
        "width": 100
      },
      "processed": {
        "type": "Boolean",
        "visible": false,
        "index": true,
        "fullName": "Processed",
        "description": "If true then the record was already processed, otherwise rawData needs to be processed to produce the rest of the records fields",
        "width": 20,
        "visibilityPriority": 100
      },
      "key": {
        "type": "String",
        "visible": false,
        "unique": true,
        "fullName": "Key",
        "description": "Unique key identifying each record to prevent duplicates. This is different from _id as it is based on the record contents",
        "width": 150,
        "searchable": true,
        "transform": [
          "trim"
        ],
        "visibilityPriority": 100
      },
      "source": {
        "type": "String",
        "visible": false,
        "index": true,
        "list": "dataSources",
        "fullName": "Source",
        "description": "Data source as specified in dataPulls or (in the future) in 0_data_sources.json",
        "width": 150,
        "searchable": true,
        "transform": [
          "trim"
        ],
        "visibilityPriority": 100
      },
      "name": {
        "type": "String",
        "searchable": true,
        "index": true,
        "fullName": "Name",
        "description": "Product name",
        "width": 150,
        "transform": [
          "trim"
        ],
        "visible": true,
        "visibilityPriority": 100
      },
      "category": {
        "type": "String",
        "searchable": false,
        "index": true,
        "fullName": "Category",
        "description": "Category of the product",
        "width": 150,
        "transform": [
          "trim"
        ],
        "visible": true,
        "visibilityPriority": 100
      },
      "generatorBatchNumber": {
        "type": "String",
        "visible": false,
        "generated": true,
        "fullName": "Generator Batch Number",
        "description": "Set to the ID of generator batch for synthetic records"
      }
    },
    "defaultSortBy": {
      "_id": -1
    }
  },
  "productsVaccines": {
    "type": "Schema",
    "fullName": "Vaccine Products",
    "limitReturnedRecords": 30,
    "defaultSortBy": {
      "tradeName": -1
    },
    "serverSide": true,
    "requiresAuthentication": true,
    "description": "Global catalog of vaccines supported by the system",
    "fields": {
      "rawData": {
        "type": "Mixed",
        "visible": false,
        "fullName": "Raw Data",
        "description": "Contains the pulled data as-is for future reparsing",
        "visibilityPriority": 100,
        "width": 100
      },
      "processed": {
        "type": "Boolean",
        "visible": false,
        "index": true,
        "fullName": "Processed",
        "description": "If true then the record was already processed, otherwise rawData needs to be processed to produce the rest of the records fields",
        "width": 20,
        "visibilityPriority": 100
      },
      "key": {
        "type": "String",
        "visible": false,
        "unique": true,
        "fullName": "Key",
        "description": "Unique key identifying each record to prevent duplicates. This is different from _id as it is based on the record contents",
        "width": 150,
        "searchable": true,
        "transform": [
          "trim"
        ],
        "visibilityPriority": 100
      },
      "source": {
        "type": "String",
        "visible": false,
        "index": true,
        "list": "dataSources",
        "fullName": "Source",
        "description": "Data source as specified in dataPulls or (in the future) in 0_data_sources.json",
        "width": 150,
        "searchable": true,
        "transform": [
          "trim"
        ],
        "visibilityPriority": 100
      },
      "name": {
        "type": "String",
        "searchable": true,
        "index": true,
        "fullName": "Name",
        "description": "Product name",
        "width": 150,
        "transform": [
          "trim"
        ],
        "visible": true,
        "visibilityPriority": 100
      },
      "tradeName": {
        "type": "String",
        "searchable": true,
        "index": true,
        "fullName": "Description",
        "description": "Description of the product",
        "width": 150,
        "transform": [
          "trim"
        ],
        "visible": true,
        "visibilityPriority": 100
      },
      "generatorBatchNumber": {
        "type": "String",
        "visible": false,
        "generated": true,
        "fullName": "Generator Batch Number",
        "description": "Set to the ID of generator batch for synthetic records"
      }
    }
  },
  "recalls": {
    "type": "Schema",
    "fullName": "Recalls",
    "limitReturnedRecords": 50,
    "serverSide": true,
    "description": "Contains recalls pulled from various sources",
    "fields": {
      "rawData": {
        "type": "Mixed",
        "visible": false,
        "fullName": "Raw Data",
        "description": "Contains the pulled data as-is for future reparsing",
        "visibilityPriority": 100,
        "width": 100
      },
      "processed": {
        "type": "Boolean",
        "visible": false,
        "index": true,
        "fullName": "Processed",
        "description": "If true then the record was already processed, otherwise rawData needs to be processed to produce the rest of the records fields",
        "width": 20,
        "visibilityPriority": 100
      },
      "key": {
        "type": "String",
        "visible": false,
        "unique": true,
        "fullName": "Key",
        "description": "Unique key identifying each record to prevent duplicates. This is different from _id as it is based on the record contents",
        "width": 150,
        "searchable": true,
        "transform": [
          "trim"
        ],
        "visibilityPriority": 100
      },
      "source": {
        "type": "String",
        "visible": false,
        "index": true,
        "list": "dataSources",
        "fullName": "Source",
        "description": "Data source as specified in dataPulls or (in the future) in 0_data_sources.json",
        "width": 150,
        "searchable": true,
        "transform": [
          "trim"
        ],
        "visibilityPriority": 100
      },
      "subject": {
        "type": "String",
        "index": true,
        "fullName": "Subject",
        "description": "Short description of the recall event.",
        "width": 150,
        "searchable": true,
        "transform": [
          "trim"
        ],
        "visible": true,
        "visibilityPriority": 100
      },
      "details": {
        "type": "String",
        "index": true,
        "fullName": "Description",
        "description": "Adverse event Details",
        "width": 150,
        "searchable": true,
        "transform": [
          "trim"
        ],
        "visible": true,
        "visibilityPriority": 100
      },
      "ndcs": {
        "type": "String[]",
        "visible": false,
        "fullName": "NDC",
        "description": "National Drug Code",
        "visibilityPriority": 100,
        "width": 100
      },
      "kNumbers": {
        "type": "String[]",
        "visible": false,
        "fullName": "K Numbers",
        "description": "K Number",
        "visibilityPriority": 100,
        "width": 100
      },
      "date": {
        "type": "Date",
        "index": true,
        "fullName": "Posted Date",
        "description": "The date when the alert was posted",
        "width": 85,
        "visible": true,
        "visibilityPriority": 100
      },
      "generatorBatchNumber": {
        "type": "String",
        "visible": false,
        "generated": true,
        "fullName": "Generator Batch Number",
        "description": "Set to the ID of generator batch for synthetic records"
      }
    },
    "requiresAuthentication": true,
    "defaultSortBy": {
      "_id": -1
    }
  },
  "piis": {
    "fields": {
      "demographics": {
        "type": "Subschema",
        "fullName": "My Demographic Data",
        "description": "This contains your demographic data",
        "limitReturnedRecords": 1,
        "singleRecord": true,
        "requiresAuthentication": true,
        "fields": {
          "birthDate": {
            "type": "Date",
            "visible": false,
            "fullName": "Birth Date",
            "description": "The healthy citizen's date of birth.",
            "width": 85,
            "visibilityPriority": 100
          },
          "ageRange": {
            "type": "String",
            "fullName": "My Age Range",
            "list": "ageRanges",
            "description": "My age range.",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visible": true,
            "visibilityPriority": 100
          },
          "gender": {
            "type": "String",
            "list": "genders",
            "required": true,
            "fullName": "Gender",
            "description": "The healthy citizen's gender.",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visible": true,
            "visibilityPriority": 100
          },
          "hispanic": {
            "type": "String",
            "visible": false,
            "list": "triState",
            "fullName": "Hispanic",
            "description": "True if the healthy citizen is of hispanic origin",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visibilityPriority": 100
          },
          "race": {
            "type": "String",
            "list": "races",
            "fullName": "Race",
            "description": "The race of the healthy citizen.",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visible": true,
            "visibilityPriority": 100
          },
          "geographicRegion": {
            "type": "String",
            "fullName": "Geographic Region",
            "list": "geographicRegions",
            "description": "Pick the geographic area where I live.",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visible": true,
            "visibilityPriority": 100
          },
          "zip": {
            "type": "String",
            "fullName": "Zip",
            "validate": [
              {
                "validator": "minLength",
                "arguments": {
                  "length": "5"
                },
                "errorMessages": {
                  "default": "Value is too short, should be at least $length characters long"
                }
              },
              {
                "validator": "maxLength",
                "arguments": {
                  "length": "10"
                },
                "errorMessages": {
                  "default": "Value is too long, should be at most $length characters long"
                }
              }
            ],
            "description": "The zip code where the patient lives.",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visible": true,
            "visibilityPriority": 100
          },
          "_id": {
            "type": "ObjectID",
            "visible": false,
            "generated": true,
            "fullName": "Subschema element id",
            "description": "Subschema element id",
            "generatorSpecification": [
              "_id()"
            ]
          }
        },
        "defaultSortBy": {
          "_id": -1
        }
      },
      "hospitals": {
        "type": "Subschema",
        "defaultSortBy": {
          "name": -1
        },
        "fullName": "My Medical Facilities",
        "description": "This contains list of all possible hospitals HC supports data exchange with. Hospitals assiciated with a specific account are stored in the PHI data",
        "limitReturnedRecords": 50,
        "requiresAuthentication": false,
        "fields": {
          "clinician": {
            "type": "String",
            "required": true,
            "fullName": "Healthcare Provider Name",
            "validate": [
              {
                "validator": "maxLength",
                "arguments": {
                  "length": "200"
                },
                "errorMessages": {
                  "default": "Value is too long, should be at most $length characters long"
                }
              }
            ],
            "description": "The name of the healthcare provider (MD, nurse, therapist, etc)",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visible": true,
            "visibilityPriority": 100
          },
          "group": {
            "type": "String",
            "required": true,
            "fullName": "Healthcare Group/Practice Name",
            "validate": [
              {
                "validator": "maxLength",
                "arguments": {
                  "length": "200"
                },
                "errorMessages": {
                  "default": "Value is too long, should be at most $length characters long"
                }
              }
            ],
            "description": "The name of the healthcare group or practice",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visible": true,
            "visibilityPriority": 100
          },
          "name": {
            "type": "String",
            "fullName": "Medical Facility Name",
            "validate": [
              {
                "validator": "maxLength",
                "arguments": {
                  "length": "200"
                },
                "errorMessages": {
                  "default": "Value is too long, should be at most $length characters long"
                }
              }
            ],
            "description": "The name of the hospital",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visible": true,
            "visibilityPriority": 100
          },
          "ehrAvailable": {
            "type": "Boolean",
            "required": false,
            "fullName": "Electronic Record Available",
            "description": "Is your health record available electronically from this care provider? If yes, please fill in next 3 fields.",
            "width": 20,
            "visible": true,
            "visibilityPriority": 100
          },
          "patientID": {
            "type": "String",
            "fullName": "Your Patient ID",
            "validate": [
              {
                "validator": "maxLength",
                "arguments": {
                  "length": "100"
                },
                "errorMessages": {
                  "default": "Value is too long, should be at most $length characters long"
                }
              }
            ],
            "description": "Your patient identification value from the facility",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visible": true,
            "visibilityPriority": 100
          },
          "authID": {
            "type": "String",
            "fullName": "Your Authorization ID",
            "validate": [
              {
                "validator": "maxLength",
                "arguments": {
                  "length": "100"
                },
                "errorMessages": {
                  "default": "Value is too long, should be at most $length characters long"
                }
              }
            ],
            "description": "Your patient authorization value from the facility",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visible": true,
            "visibilityPriority": 100
          },
          "apiUrl": {
            "type": "String",
            "subtype": "Url",
            "fullName": "API URL",
            "validate": [
              {
                "validator": "regex",
                "arguments": {
                  "regex": "^(https?:\\/\\/)?([\\da-z\\.-]+)\\.([a-z\\.]{2,6})([\\/\\w \\.-]*)*\\/?$",
                  "regexOptions": "i"
                },
                "errorMessages": {
                  "default": "Please enter correct URL"
                }
              },
              {
                "validator": "maxLength",
                "arguments": {
                  "length": "200"
                },
                "errorMessages": {
                  "default": "Value is too long, should be at most $length characters long"
                }
              }
            ],
            "description": "The URL of the FHIR endpoint on hospital side",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visible": true,
            "visibilityPriority": 100
          },
          "_id": {
            "type": "ObjectID",
            "visible": false,
            "generated": true,
            "fullName": "Subschema element id",
            "description": "Subschema element id",
            "generatorSpecification": [
              "_id()"
            ]
          }
        }
      },
      "firstName": {
        "fullName": "First Name",
        "type": "String",
        "default": "",
        "required": true,
        "colspan": 2,
        "description": "Enter your First/Given name.",
        "width": 150,
        "searchable": true,
        "transform": [
          "trim"
        ],
        "visible": true,
        "visibilityPriority": 100
      },
      "lastName": {
        "fullName": "Last Name",
        "type": "String",
        "default": "",
        "required": true,
        "colspan": 2,
        "description": "Enter your Family/Surname name.",
        "width": 150,
        "searchable": true,
        "transform": [
          "trim"
        ],
        "visible": true,
        "visibilityPriority": 100
      },
      "displayName": {
        "type": "String",
        "generated": true,
        "fullName": "Display Name",
        "description": "The name the citizen wants displayed when using the HealthyCitizen application.",
        "width": 150,
        "searchable": true,
        "transform": [
          "trim"
        ],
        "visible": true,
        "visibilityPriority": 100
      },
      "email": {
        "type": "String",
        "default": "",
        "required": true,
        "subtype": "Email",
        "fullName": "Email",
        "description": "The citizen's email address. Could be different from the password recovery email.",
        "width": 150,
        "searchable": true,
        "transform": [
          "trim"
        ],
        "validate": [
          {
            "validator": "regex",
            "arguments": {
              "regex": "^[a-zA-Z0-9.!#$%&’*+\\/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\\.[a-zA-Z0-9-]+)*$",
              "regexOptions": "i"
            },
            "errorMessages": {
              "default": "Please enter correct email"
            }
          }
        ],
        "visible": true,
        "visibilityPriority": 100
      },
      "linkedAccounts": {
        "type": "Array",
        "visible": false,
        "fullName": "linkedAccounts",
        "description": "List of social networks accounts linked to this profile",
        "fields": {
          "name": {
            "type": "String",
            "generated": true,
            "visible": false,
            "fullName": "Provider",
            "description": "Account provider (such as facebook, twitter etc)",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visibilityPriority": 100
          },
          "data": {
            "type": "Mixed",
            "visible": false,
            "fullName": "Provider Data",
            "description": "Account provider-specific data",
            "visibilityPriority": 100,
            "width": 100
          }
        },
        "visibilityPriority": 100,
        "width": 100
      },
      "updated": {
        "type": "Date",
        "visible": false,
        "generated": true,
        "fullName": "Updated",
        "description": "The system generated date when the citizen user account was updated.",
        "width": 85,
        "visibilityPriority": 100
      },
      "created": {
        "type": "Date",
        "visible": false,
        "defaultF": "dateNow",
        "generated": true,
        "fullName": "Created",
        "description": "The system generated date when the citizen user account was created.",
        "width": 85,
        "visibilityPriority": 100
      },
      "resetPasswordToken": {
        "type": "String",
        "visible": false,
        "generated": true,
        "fullName": "Reset Password Token",
        "description": "The system assigned token that is sent to the citizen when they request a password reset.",
        "width": 150,
        "searchable": true,
        "transform": [
          "trim"
        ],
        "visibilityPriority": 100
      },
      "resetPasswordExpires": {
        "type": "Date",
        "visible": false,
        "generated": true,
        "fullName": "Reset Password Expires",
        "description": "The date the password token will expire.",
        "width": 85,
        "visibilityPriority": 100
      },
      "settings": {
        "type": "Object",
        "fullName": "Settings",
        "visible": false,
        "fields": {
          "twoFactorAuth": {
            "fullName": "Two Factor Authentication",
            "type": "Boolean",
            "visible": false,
            "width": 20,
            "visibilityPriority": 100
          },
          "phoneVerified": {
            "type": "Boolean",
            "fullName": "Phone Verified",
            "visible": false,
            "width": 20,
            "visibilityPriority": 100
          },
          "twoFactorAuthSecretBase32": {
            "type": "String",
            "fullName": "Two Factor Authentication Secret",
            "generated": true,
            "visible": false,
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visibilityPriority": 100
          }
        },
        "visibilityPriority": 100,
        "width": 100
      },
      "generatorBatchNumber": {
        "type": "String",
        "visible": false,
        "generated": true,
        "fullName": "Generator Batch Number",
        "description": "Set to the ID of generator batch for synthetic records"
      }
    },
    "type": "Schema",
    "fullName": "Personally Identifiable Information",
    "singleRecord": true,
    "limitReturnedRecords": 1,
    "requiresAuthentication": true,
    "defaultSortBy": {
      "_id": -1
    }
  },
  "phis": {
    "fields": {
      "activities": {
        "type": "Subschema",
        "fullName": "My Activities",
        "requiresAuthentication": true,
        "defaultSortBy": {
          "dateActivity": -1
        },
        "fields": {
          "dateActivity": {
            "type": "Date",
            "fullName": "Date of Activity",
            "visibilityPriority": 1,
            "required": true,
            "description": "Date on which activity is performed.",
            "validate": [
              {
                "validator": "notInFuture",
                "arguments": {},
                "errorMessages": {
                  "default": "This date cannot be in the future"
                }
              }
            ],
            "width": 85,
            "visible": true
          },
          "activity": {
            "type": "String",
            "fullName": "Activity Performed",
            "visibilityPriority": 2,
            "list": "activities",
            "required": true,
            "description": "Pick the activity performed.",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visible": true
          },
          "duration": {
            "type": "Number",
            "fullName": "Activity Duration",
            "visibilityPriority": 3,
            "required": true,
            "description": "Total duration of activity in minutes.",
            "width": 30,
            "visible": true
          },
          "comments": {
            "type": "String",
            "fullName": "Activity Comments",
            "validate": [
              {
                "validator": "maxLength",
                "arguments": {
                  "length": "500"
                },
                "errorMessages": {
                  "default": "Value is too long, should be at most $length characters long"
                }
              }
            ],
            "visibilityPriority": 4,
            "description": "Comments about the activity.",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visible": true
          },
          "_id": {
            "type": "ObjectID",
            "visible": false,
            "generated": true,
            "fullName": "Subschema element id",
            "description": "Subschema element id",
            "generatorSpecification": [
              "_id()"
            ]
          }
        },
        "limitReturnedRecords": 0
      },
      "deaths": {
        "type": "Subschema",
        "fullName": "Deaths",
        "visible": false,
        "requiresAuthentication": true,
        "fields": {
          "date": {
            "type": "Date",
            "visibilityPriority": 1,
            "fullName": "Death Date",
            "description": "The date of the patient's death.",
            "width": 85,
            "visible": true
          },
          "dateImputed": {
            "type": "String",
            "list": "dateImputedTypes",
            "fullName": "Date Imputed",
            "description": "When DeathDt is imputed, this variable indicates which parts of the date were imputed.",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visible": true,
            "visibilityPriority": 100
          },
          "source": {
            "type": "String",
            "list": "deathSourceTypes",
            "fullName": "Source",
            "validate": [
              {
                "validator": "maxLength",
                "arguments": {
                  "length": "1"
                },
                "errorMessages": {
                  "default": "Value is too long, should be at most $length characters long"
                }
              }
            ],
            "description": "The source of the information regarding the patient's death.",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visible": true,
            "visibilityPriority": 100
          },
          "confidence": {
            "type": "String",
            "validate": [
              {
                "validator": "maxLength",
                "arguments": {
                  "length": "1"
                },
                "errorMessages": {
                  "default": "Value is too long, should be at most $length characters long"
                }
              }
            ],
            "list": "deathConfidenceTypes",
            "fullName": "Confidence",
            "description": "The level of confidence as to the accuracy of the information?",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visible": true,
            "visibilityPriority": 100
          },
          "cause": {
            "type": "Object",
            "fullName": "Cause of Death",
            "fields": {
              "causeOfDeathCode": {
                "type": "String",
                "validate": [
                  {
                    "validator": "maxLength",
                    "arguments": {
                      "length": "8"
                    },
                    "errorMessages": {
                      "default": "Value is too long, should be at most $length characters long"
                    }
                  }
                ],
                "fullName": "Cause Of Death Code",
                "description": "ICD-10 codes that identify the patient's cause of death.",
                "width": 150,
                "searchable": true,
                "transform": [
                  "trim"
                ],
                "visible": true,
                "visibilityPriority": 100
              },
              "causeOfDeathCodeType": {
                "type": "String",
                "validate": [
                  {
                    "validator": "maxLength",
                    "arguments": {
                      "length": "1"
                    },
                    "errorMessages": {
                      "default": "Value is too long, should be at most $length characters long"
                    }
                  }
                ],
                "list": "causeOfDeathCodeTypes",
                "fullName": "Cause Of Death Code Type",
                "description": "ICD-10 codes that classifies or groups the cause of death?",
                "width": 150,
                "searchable": true,
                "transform": [
                  "trim"
                ],
                "visible": true,
                "visibilityPriority": 100
              },
              "source": {
                "type": "String",
                "validate": [
                  {
                    "validator": "maxLength",
                    "arguments": {
                      "length": "1"
                    },
                    "errorMessages": {
                      "default": "Value is too long, should be at most $length characters long"
                    }
                  }
                ],
                "list": "deathSources",
                "fullName": "Source",
                "description": "The source of the information regarding the patient's cause  of death (e.g., autopy, etc.).",
                "width": 150,
                "searchable": true,
                "transform": [
                  "trim"
                ],
                "visible": true,
                "visibilityPriority": 100
              },
              "confidence": {
                "type": "String",
                "validate": [
                  {
                    "validator": "maxLength",
                    "arguments": {
                      "length": "1"
                    },
                    "errorMessages": {
                      "default": "Value is too long, should be at most $length characters long"
                    }
                  }
                ],
                "list": "deathConfidenceTypes",
                "fullName": "Confidence",
                "description": "The level of confidence as to the accuracy of the information?",
                "width": 150,
                "searchable": true,
                "transform": [
                  "trim"
                ],
                "visible": true,
                "visibilityPriority": 100
              }
            },
            "visible": true,
            "visibilityPriority": 100,
            "width": 100
          },
          "_id": {
            "type": "ObjectID",
            "visible": false,
            "generated": true,
            "fullName": "Subschema element id",
            "description": "Subschema element id",
            "generatorSpecification": [
              "_id()"
            ]
          }
        },
        "limitReturnedRecords": 0,
        "defaultSortBy": {
          "_id": -1
        }
      },
      "groupings": {
        "type": "Subschema",
        "fullName": "My Groups",
        "description": "My Groups",
        "limitReturnedRecords": 1,
        "singleRecord": true,
        "requiresAuthentication": true,
        "fields": {
          "medicalConditions": {
            "type": "String[]",
            "fullName": "Medical Conditions",
            "list": "medicalConditions",
            "description": "Select one or more medical conditions that apply to you",
            "visible": true,
            "visibilityPriority": 100,
            "width": 100
          },
          "medicationTypes": {
            "type": "String[]",
            "fullName": "Medication Types",
            "list": "diabetesMedicationTypes",
            "description": "Select one or more medication types that apply to you.",
            "visible": true,
            "visibilityPriority": 100,
            "width": 100
          },
          "procedures": {
            "type": "String[]",
            "fullName": "Past Procedures",
            "list": "procedures",
            "description": "Select one or more procedures that apply to you.",
            "visible": true,
            "visibilityPriority": 100,
            "width": 100
          },
          "diabetesTypes": {
            "type": "String",
            "fullName": "Diabetes Type",
            "list": "diabetesTypes",
            "description": "Select  one or more diagnoses that apply to you.",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visible": true,
            "visibilityPriority": 100
          },
          "diagnosis": {
            "type": "String[]",
            "fullName": "Diabetes Related Diagnoses",
            "list": "diagnoses",
            "description": "Select  one or more diagnoses that apply to you.",
            "visible": true,
            "visibilityPriority": 100,
            "width": 100
          },
          "glucoseAverages": {
            "type": "String",
            "fullName": "Fasting Blood Sugar Average",
            "list": "glucoses",
            "description": "Select your average fasting glucose range.",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visible": true,
            "visibilityPriority": 100
          },
          "a1cs": {
            "type": "String",
            "fullName": "Glycoscolated Hemoglobin Range",
            "list": "a1cs",
            "description": "Select your glycoscolated hemoglobin results range.",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visible": true,
            "visibilityPriority": 100
          },
          "yearsWithDiabetes": {
            "type": "String",
            "fullName": "Years with Diabetes",
            "list": "yearsWithDiabetes",
            "description": "Select how many years you have had diabetes.",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visible": true,
            "visibilityPriority": 100
          },
          "_id": {
            "type": "ObjectID",
            "visible": false,
            "generated": true,
            "fullName": "Subschema element id",
            "description": "Subschema element id",
            "generatorSpecification": [
              "_id()"
            ]
          }
        },
        "defaultSortBy": {
          "_id": -1
        }
      },
      "diets": {
        "type": "Subschema",
        "fullName": "My Diet",
        "requiresAuthentication": true,
        "defaultSortBy": {
          "mealDate": -1,
          "meal": -1
        },
        "fields": {
          "mealDate": {
            "type": "Date",
            "fullName": "Date of Meal",
            "visibilityPriority": 1,
            "required": true,
            "description": "Date of meal.",
            "validate": [
              {
                "validator": "notInFuture",
                "arguments": {},
                "errorMessages": {
                  "default": "This date cannot be in the future"
                }
              }
            ],
            "width": 85,
            "visible": true
          },
          "meal": {
            "type": "String",
            "visibilityPriority": 2,
            "fullName": "Meal of the Day",
            "list": "meals",
            "required": true,
            "description": "Pick the meal of the day.",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visible": true
          },
          "mealType": {
            "type": "String",
            "visibilityPriority": 3,
            "fullName": "1st Quality or Type of Meal",
            "list": "mealType",
            "required": true,
            "description": "Qualify the type of meal.",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visible": true
          },
          "mealType2": {
            "type": "String",
            "visibilityPriority": 4,
            "fullName": "2nd Quality or Type of Meal ",
            "list": "mealType",
            "description": "Qualify the type of meal.",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visible": true
          },
          "mealType3": {
            "type": "String",
            "visibilityPriority": 5,
            "fullName": "3rd Quality or Type of Meal ",
            "list": "mealType",
            "description": "Qualify the type of meal.",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visible": true
          },
          "comments": {
            "type": "String",
            "visibilityPriority": 6,
            "validate": [
              {
                "validator": "maxLength",
                "arguments": {
                  "length": "500"
                },
                "errorMessages": {
                  "default": "Value is too long, should be at most $length characters long"
                }
              }
            ],
            "fullName": "Meal Comments",
            "description": "Describe your meal.",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visible": true
          },
          "_id": {
            "type": "ObjectID",
            "visible": false,
            "generated": true,
            "fullName": "Subschema element id",
            "description": "Subschema element id",
            "generatorSpecification": [
              "_id()"
            ]
          }
        },
        "limitReturnedRecords": 0
      },
      "encounters": {
        "fields": {
          "diagnoses": {
            "type": "Subschema",
            "fullName": "Diagnoses",
            "requiresAuthentication": true,
            "defaultSortBy": {
              "admissionDate": -1
            },
            "fields": {
              "sourceType": {
                "type": "String",
                "list": "sourceTypes",
                "fullName": "Source of Record",
                "visible": false,
                "description": "The source of the patient data (e.g., hospital, clinic, etc.,).",
                "width": 150,
                "searchable": true,
                "transform": [
                  "trim"
                ],
                "visibilityPriority": 100
              },
              "admissionDate": {
                "type": "Date",
                "visibilityPriority": 1,
                "fullName": "Diagnosis Date",
                "description": "The date the patient was admitted to a health care facility.",
                "validate": [
                  {
                    "validator": "notBeforeEncounterAdmissionDate",
                    "arguments": {},
                    "errorMessages": {
                      "default": "This date cannot be before encounter Admission Date ($date)"
                    }
                  },
                  {
                    "validator": "notAfterEncounterDischargeDate",
                    "arguments": {},
                    "errorMessages": {
                      "default": "This date cannot be after encounter Discharge Date ($date)"
                    }
                  },
                  {
                    "validator": "notInFuture",
                    "arguments": {},
                    "errorMessages": {
                      "default": "This date cannot be in the future"
                    }
                  }
                ],
                "width": 85,
                "visible": true
              },
              "providerId": {
                "type": "String",
                "visibilityPriority": 2,
                "fullName": "Provider ID",
                "visible": false,
                "description": "The identification code of the healthcare provider that treated the patient.",
                "width": 150,
                "searchable": true,
                "transform": [
                  "trim"
                ]
              },
              "diagnosisCode": {
                "type": "String[]",
                "list": "diagnoses",
                "fullName": "Diagnoses",
                "required": true,
                "description": "Select all medical diagnoses from the healthcare provider during the encounter.",
                "visible": true,
                "visibilityPriority": 100,
                "width": 100
              },
              "diagnosisCodeType": {
                "type": "String",
                "list": "diagnosisCodeTypes",
                "fullName": "Diagnosis Code Type",
                "visible": false,
                "description": "DRG coding version used.",
                "width": 150,
                "searchable": true,
                "transform": [
                  "trim"
                ],
                "visibilityPriority": 100
              },
              "originalDiagnosisCode": {
                "type": "String",
                "fullName": "Original Diagnosis Code",
                "visible": false,
                "description": "On of the 467 DRG codes from CMS.",
                "width": 150,
                "searchable": true,
                "transform": [
                  "trim"
                ],
                "visibilityPriority": 100
              },
              "principalDischargeDiagnosis": {
                "type": "String",
                "list": "principalDischargeDiagnosisFlags",
                "visible": false,
                "fullName": "Prinicipal Discharge Diagnosis",
                "description": "The principal diagnosis for the patient at the time of discharge.",
                "width": 150,
                "searchable": true,
                "transform": [
                  "trim"
                ],
                "visibilityPriority": 100
              },
              "_id": {
                "type": "ObjectID",
                "visible": false,
                "generated": true,
                "fullName": "Subschema element id",
                "description": "Subschema element id",
                "generatorSpecification": [
                  "_id()"
                ]
              }
            },
            "limitReturnedRecords": 0
          },
          "procedures": {
            "type": "Subschema",
            "fullName": "Procedures",
            "requiresAuthentication": true,
            "defaultSortBy": {
              "procedureStartDate": -1
            },
            "fields": {
              "procedureId": {
                "type": "String",
                "visible": false,
                "fullName": "Procedure ID",
                "width": 150,
                "searchable": true,
                "transform": [
                  "trim"
                ],
                "visibilityPriority": 100
              },
              "sourceType": {
                "type": "String",
                "list": "sourceTypes",
                "fullName": "Source of Record",
                "visible": false,
                "description": "The source of the patient data (e.g., hospital, clinic, etc.,).",
                "width": 150,
                "searchable": true,
                "transform": [
                  "trim"
                ],
                "visibilityPriority": 100
              },
              "procedureStartDate": {
                "type": "Date",
                "visibilityPriority": 1,
                "fullName": "Procedure Start Date",
                "required": true,
                "description": "The date the patient procedure was started.",
                "validate": [
                  {
                    "validator": "notBeforeEncounterAdmissionDate",
                    "arguments": {},
                    "errorMessages": {
                      "default": "This date cannot be before encounter Admission Date ($date)"
                    }
                  },
                  {
                    "validator": "notAfterEncounterDischargeDate",
                    "arguments": {},
                    "errorMessages": {
                      "default": "This date cannot be after encounter Discharge Date ($date)"
                    }
                  },
                  {
                    "validator": "notInFuture",
                    "arguments": {},
                    "errorMessages": {
                      "default": "This date cannot be in the future"
                    }
                  }
                ],
                "width": 85,
                "visible": true
              },
              "procedureEndDate": {
                "type": "Date",
                "fullName": "Procedure End Date",
                "required": true,
                "description": "The date the patient procedure was complete.",
                "validate": [
                  {
                    "validator": "min",
                    "arguments": {
                      "limit": "$procedureStartDate"
                    },
                    "errorMessages": {
                      "default": "Value $val is too small, should be greater than @limit",
                      "date": "Date $val should be after @limit (#limit)"
                    }
                  },
                  {
                    "validator": "notAfterEncounterDischargeDate",
                    "arguments": {},
                    "errorMessages": {
                      "default": "This date cannot be after encounter Discharge Date ($date)"
                    }
                  },
                  {
                    "validator": "notInFuture",
                    "arguments": {},
                    "errorMessages": {
                      "default": "This date cannot be in the future"
                    }
                  }
                ],
                "width": 85,
                "visible": true,
                "visibilityPriority": 100
              },
              "providerId": {
                "type": "String",
                "fullName": "Provider ID",
                "visible": false,
                "description": "The identification code of the healthcare provider that treated the patient.",
                "width": 150,
                "searchable": true,
                "transform": [
                  "trim"
                ],
                "visibilityPriority": 100
              },
              "procedureCode": {
                "type": "String[]",
                "visibilityPriority": 2,
                "list": "procedures",
                "fullName": "Procedures",
                "required": true,
                "description": "All procedures that were performed on the patient during the encounter.",
                "visible": true,
                "width": 100
              },
              "procedureCodeType": {
                "type": "String",
                "list": "encountersProcedureCodeTypes",
                "fullName": "Procedure Code Type",
                "description": "ICD-10 procedure code grouping.",
                "width": 150,
                "searchable": true,
                "transform": [
                  "trim"
                ],
                "visible": true,
                "visibilityPriority": 100
              },
              "originalProcedureCode": {
                "type": "String",
                "fullName": "Original Procedure Code",
                "visible": false,
                "description": "Is this the first procedure?",
                "width": 150,
                "searchable": true,
                "transform": [
                  "trim"
                ],
                "visibilityPriority": 100
              },
              "_id": {
                "type": "ObjectID",
                "visible": false,
                "generated": true,
                "fullName": "Subschema element id",
                "description": "Subschema element id",
                "generatorSpecification": [
                  "_id()"
                ]
              }
            },
            "limitReturnedRecords": 0
          },
          "vitalSigns": {
            "type": "Subschema",
            "fullName": "Vital Signs",
            "requiresAuthentication": true,
            "defaultSortBy": {
              "measureDate": -1
            },
            "fields": {
              "sourceType": {
                "type": "String",
                "list": "sourceTypes",
                "fullName": "Source of Record",
                "visible": false,
                "description": "The source of the patient data (e.g., hospital, clinic, etc.,).",
                "width": 150,
                "searchable": true,
                "transform": [
                  "trim"
                ],
                "visibilityPriority": 100
              },
              "measureDate": {
                "type": "Date",
                "visibilityPriority": 1,
                "fullName": "Measure Date",
                "required": true,
                "description": "The date the patient's vitals were taken during the encounter.",
                "validate": [
                  {
                    "validator": "notBeforeEncounterAdmissionDate",
                    "arguments": {},
                    "errorMessages": {
                      "default": "This date cannot be before encounter Admission Date ($date)"
                    }
                  },
                  {
                    "validator": "notInFuture",
                    "arguments": {},
                    "errorMessages": {
                      "default": "This date cannot be in the future"
                    }
                  },
                  {
                    "validator": "notAfterEncounterDischargeDate",
                    "arguments": {},
                    "errorMessages": {
                      "default": "This date cannot be after encounter Discharge Date ($date)"
                    }
                  }
                ],
                "width": 85,
                "visible": true
              },
              "height": {
                "type": "Number",
                "subtype": "ImperialHeight",
                "fullName": "Height",
                "required": true,
                "description": "The patient's height.",
                "width": 30,
                "transform": [
                  [
                    "heightImperialToMetric",
                    "heightMetricToImperial"
                  ]
                ],
                "validate": [
                  {
                    "validator": "imperialHeightRange",
                    "arguments": {
                      "from": [
                        0,
                        1
                      ],
                      "to": [
                        8,
                        11
                      ]
                    },
                    "errorMessages": {
                      "default": "This height doesn't look reasonable, should be more than 1\" less than 8'11\""
                    }
                  }
                ],
                "visible": true,
                "visibilityPriority": 100
              },
              "weight": {
                "type": "Number",
                "subtype": "ImperialWeight",
                "fullName": "Weight",
                "description": "The patient's weight in pounds.",
                "width": 30,
                "transform": [
                  "trim",
                  [
                    "weightImperialToMetric",
                    "weightMetricToImperial"
                  ]
                ],
                "validate": [
                  {
                    "validator": "min",
                    "arguments": {
                      "limit": "1"
                    },
                    "errorMessages": {
                      "default": "Value $val is too small, should be greater than @limit",
                      "date": "Date $val should be after @limit (#limit)"
                    }
                  },
                  {
                    "validator": "max",
                    "arguments": {
                      "limit": "1000"
                    },
                    "errorMessages": {
                      "default": "Value $val is too large, should be less than @limit",
                      "date": "Date $val should be before @limit (#limit)"
                    }
                  }
                ],
                "visible": true,
                "visibilityPriority": 100
              },
              "bloodPressureType": {
                "type": "String",
                "validate": [
                  {
                    "validator": "maxLength",
                    "arguments": {
                      "length": "1"
                    },
                    "errorMessages": {
                      "default": "Value is too long, should be at most $length characters long"
                    }
                  }
                ],
                "list": "bloodPressureTypes",
                "fullName": "Blood Pressure Type",
                "description": "The type of device used to capture the patient's blood pressure.",
                "width": 150,
                "searchable": true,
                "transform": [
                  "trim"
                ],
                "visible": true,
                "visibilityPriority": 100
              },
              "bloodPressurePosition": {
                "type": "String",
                "validate": [
                  {
                    "validator": "maxLength",
                    "arguments": {
                      "length": "1"
                    },
                    "errorMessages": {
                      "default": "Value is too long, should be at most $length characters long"
                    }
                  }
                ],
                "list": "bloodPressurePosition",
                "fullName": "Blood Pressure Position",
                "description": "The position where the blood pressure measuring device was placed to obtain the patient's blood pressure.",
                "width": 150,
                "searchable": true,
                "transform": [
                  "trim"
                ],
                "visible": true,
                "visibilityPriority": 100
              },
              "systolic": {
                "type": "Number",
                "fullName": "Systolic",
                "description": "The patient's systolic reading.",
                "validate": [
                  {
                    "validator": "min",
                    "arguments": {
                      "limit": "00"
                    },
                    "errorMessages": {
                      "default": "Value $val is too small, should be greater than @limit",
                      "date": "Date $val should be after @limit (#limit)"
                    }
                  },
                  {
                    "validator": "max",
                    "arguments": {
                      "limit": "400"
                    },
                    "errorMessages": {
                      "default": "Value $val is too large, should be less than @limit",
                      "date": "Date $val should be before @limit (#limit)"
                    }
                  }
                ],
                "width": 30,
                "visible": true,
                "visibilityPriority": 100
              },
              "diastolic": {
                "type": "Number",
                "fullName": "Diastolic",
                "description": "The patient's diastolic reading.",
                "validate": [
                  {
                    "validator": "min",
                    "arguments": {
                      "limit": "0"
                    },
                    "errorMessages": {
                      "default": "Value $val is too small, should be greater than @limit",
                      "date": "Date $val should be after @limit (#limit)"
                    }
                  },
                  {
                    "validator": "max",
                    "arguments": {
                      "limit": "200"
                    },
                    "errorMessages": {
                      "default": "Value $val is too large, should be less than @limit",
                      "date": "Date $val should be before @limit (#limit)"
                    }
                  }
                ],
                "width": 30,
                "visible": true,
                "visibilityPriority": 100
              },
              "tobaccoStatus": {
                "type": "String",
                "validate": [
                  {
                    "validator": "maxLength",
                    "arguments": {
                      "length": "1"
                    },
                    "errorMessages": {
                      "default": "Value is too long, should be at most $length characters long"
                    }
                  }
                ],
                "list": "tobaccoStatuses",
                "fullName": "Tobacco Status",
                "visible": false,
                "description": "Documents the patient's tobacco usage.",
                "width": 150,
                "searchable": true,
                "transform": [
                  "trim"
                ],
                "visibilityPriority": 100
              },
              "tobaccoType": {
                "type": "String",
                "validate": [
                  {
                    "validator": "maxLength",
                    "arguments": {
                      "length": "1"
                    },
                    "errorMessages": {
                      "default": "Value is too long, should be at most $length characters long"
                    }
                  }
                ],
                "list": "tobaccoType",
                "fullName": "Tobacco Type",
                "visible": false,
                "description": "Documents the type of tobacco product that the patient uses.",
                "width": 150,
                "searchable": true,
                "transform": [
                  "trim"
                ],
                "visibilityPriority": 100
              },
              "_id": {
                "type": "ObjectID",
                "visible": false,
                "generated": true,
                "fullName": "Subschema element id",
                "description": "Subschema element id",
                "generatorSpecification": [
                  "_id()"
                ]
              }
            },
            "limitReturnedRecords": 0
          },
          "encounterId": {
            "type": "String",
            "visible": false,
            "fullName": "Encounter ID",
            "description": "System generated number to uniquely identify a patients encounter with a medical professional.",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visibilityPriority": 100
          },
          "sourceType": {
            "type": "String",
            "visibilityPriority": 4,
            "list": "sourceTypes",
            "fullName": "Source of Record",
            "required": false,
            "visible": false,
            "description": "The source of the patient data (e.g., hospital, clinic, etc.,).",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ]
          },
          "admissionDate": {
            "type": "Date",
            "visibilityPriority": 1,
            "fullName": "Visit Start Date",
            "required": true,
            "description": "The date the patient was admitted to a health care facility.",
            "validate": [
              {
                "validator": "notInFuture",
                "arguments": {},
                "errorMessages": {
                  "default": "This date cannot be in the future"
                }
              },
              {
                "validator": "notAfterEncounterDischargeDate",
                "arguments": {},
                "errorMessages": {
                  "default": "This date cannot be after encounter Discharge Date ($date)"
                }
              }
            ],
            "width": 85,
            "visible": true
          },
          "dischargeDate": {
            "type": "Date",
            "visibilityPriority": 3,
            "fullName": "Visit End Date",
            "description": "The date the patient was discharged from a health care facility.",
            "validate": [
              {
                "validator": "min",
                "arguments": {
                  "limit": "$admissionDate"
                },
                "errorMessages": {
                  "default": "Value $val is too small, should be greater than @limit",
                  "date": "Date $val should be after @limit (#limit)"
                }
              },
              {
                "validator": "notInFuture",
                "arguments": {},
                "errorMessages": {
                  "default": "This date cannot be in the future"
                }
              }
            ],
            "width": 85,
            "visible": true
          },
          "providerId": {
            "type": "String",
            "fullName": "Provider ID",
            "visible": false,
            "description": "The identification code of the healthcare provider that treated the patient.",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visibilityPriority": 100
          },
          "providerName": {
            "type": "String",
            "visibilityPriority": 2,
            "width": 80,
            "fullName": "Healthcare Provider Name",
            "required": true,
            "description": "The name of the healthcare provider that treated the patient.",
            "validate": [
              {
                "validator": "minLength",
                "arguments": {
                  "length": "3"
                },
                "errorMessages": {
                  "default": "Value is too short, should be at least $length characters long"
                }
              },
              {
                "validator": "maxLength",
                "arguments": {
                  "length": "200"
                },
                "errorMessages": {
                  "default": "Value is too long, should be at most $length characters long"
                }
              }
            ],
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visible": true
          },
          "encounterType": {
            "type": "String",
            "visibilityPriority": 5,
            "list": "encounterTypes",
            "required": true,
            "fullName": "Encounter Type",
            "description": "Type of encounter with the patient (e.g., hospital, walkin clinic, etc.).",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visible": true
          },
          "facilityLocation": {
            "type": "String",
            "visibilityPriority": 6,
            "fullName": "Facility Name/Location",
            "description": "The location of the healthcare facility that the patient received treament.",
            "validate": [
              {
                "validator": "maxLength",
                "arguments": {
                  "length": "200"
                },
                "errorMessages": {
                  "default": "Value is too long, should be at most $length characters long"
                }
              }
            ],
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visible": true
          },
          "facilityCode": {
            "type": "String",
            "fullName": "Facility Code",
            "visible": false,
            "description": "The unique code that identifies the healthcare facility.",
            "validate": [
              {
                "validator": "maxLength",
                "arguments": {
                  "length": "30"
                },
                "errorMessages": {
                  "default": "Value is too long, should be at most $length characters long"
                }
              }
            ],
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visibilityPriority": 100
          },
          "dischargeDisposition": {
            "type": "String",
            "list": "dischargeDispositions",
            "visible": false,
            "fullName": "Discharge Disposition",
            "description": "The final disposition of the patient at the time of discharge.",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visibilityPriority": 100
          },
          "dischargeStatus": {
            "type": "String",
            "visibilityPriority": 7,
            "list": "encounterDischargeAndAdmittingSources",
            "fullName": "Discharge Status",
            "description": "Indicates the patient's status of discharge (e.g., discharged, in-process, etc.).",
            "validate": [
              {
                "validator": "dischargeDispositionAndStatusExpired",
                "arguments": {},
                "errorMessages": {
                  "default": "If 'Discharge Disposition' = 'Expired' then 'Discharge Status' = 'Expired'"
                }
              }
            ],
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visible": true
          },
          "diagnosisRelatedGroup": {
            "type": "String",
            "validate": [
              {
                "validator": "maxLength",
                "arguments": {
                  "length": "3"
                },
                "errorMessages": {
                  "default": "Value is too long, should be at most $length characters long"
                }
              }
            ],
            "fullName": "Diagnosis Related Group",
            "visible": false,
            "description": "ICD10",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visibilityPriority": 100
          },
          "diagnosisRelatedGroupType": {
            "type": "String",
            "list": "diagnosisRelatedGroupTypes",
            "fullName": "Diagnosis Related Group Type",
            "visible": false,
            "description": "CMS MS-DRG ",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visibilityPriority": 100
          },
          "admittingSource": {
            "type": "String",
            "list": "encountersAdmittingSource",
            "fullName": "Admitting Source",
            "visible": false,
            "description": "The source of the encounter and admission information.",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visibilityPriority": 100
          },
          "_id": {
            "type": "ObjectID",
            "visible": false,
            "generated": true,
            "fullName": "Subschema element id",
            "description": "Subschema element id",
            "generatorSpecification": [
              "_id()"
            ]
          }
        },
        "type": "Subschema",
        "fullName": "Encounters",
        "requiresAuthentication": true,
        "labelRenderer": "encounter",
        "defaultSortBy": {
          "admissionDate": -1
        },
        "limitReturnedRecords": 0
      },
      "enrollments": {
        "type": "Subschema",
        "fullName": "Enrollments",
        "requiresAuthentication": true,
        "defaultSortBy": {
          "start": -1
        },
        "fields": {
          "start": {
            "type": "Date",
            "visibilityPriority": 1,
            "fullName": "Enrollment Start Date",
            "required": true,
            "description": "insurance enrollment date.",
            "validate": [
              {
                "validator": "notInFuture",
                "arguments": {},
                "errorMessages": {
                  "default": "This date cannot be in the future"
                }
              }
            ],
            "width": 85,
            "visible": true
          },
          "end": {
            "type": "Date",
            "fullName": "Enrollment End Date",
            "description": "Insurance end date (estimated or actual).",
            "validate": [
              {
                "validator": "notInFuture",
                "arguments": {},
                "errorMessages": {
                  "default": "This date cannot be in the future"
                }
              },
              {
                "validator": "min",
                "arguments": {
                  "limit": "$start"
                },
                "errorMessages": {
                  "default": "Value $val is too small, should be greater than @limit",
                  "date": "Date $val should be after @limit (#limit)"
                }
              }
            ],
            "width": 85,
            "visible": true,
            "visibilityPriority": 100
          },
          "medicalCoverage": {
            "type": "String",
            "visibilityPriority": 2,
            "list": "triState",
            "fullName": "Medical Coverage",
            "description": "If covered (Y/N).",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visible": true
          },
          "drugCoverage": {
            "type": "String",
            "visibilityPriority": 3,
            "list": "triState",
            "fullName": "Drug Coverage",
            "description": "If covered (Y/N).",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visible": true
          },
          "chartAvailable": {
            "type": "String",
            "visible": false,
            "list": "twoState",
            "fullName": "Chart Available",
            "description": "Indicates whether a chart is available for more detailed information about the patient.",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visibilityPriority": 100
          },
          "_id": {
            "type": "ObjectID",
            "visible": false,
            "generated": true,
            "fullName": "Subschema element id",
            "description": "Subschema element id",
            "generatorSpecification": [
              "_id()"
            ]
          }
        },
        "limitReturnedRecords": 0
      },
      "homeLabs": {
        "type": "Subschema",
        "fullName": "Home Laboratories",
        "requiresAuthentication": true,
        "defaultSortBy": {
          "dateResult": -1,
          "timeResult": -1
        },
        "fields": {
          "dateResult": {
            "type": "Date",
            "visibilityPriority": 1,
            "fullName": "Entry Date",
            "required": true,
            "description": "Date of lab result.",
            "validate": [
              {
                "validator": "notInFuture",
                "arguments": {},
                "errorMessages": {
                  "default": "This date cannot be in the future"
                }
              }
            ],
            "width": 85,
            "visible": true
          },
          "timeResult": {
            "type": "String",
            "fullName": "Time of Day",
            "visibilityPriority": 2,
            "list": "dayTime",
            "required": true,
            "description": "Pick time of day the lab was taken.",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visible": true
          },
          "testType": {
            "type": "String",
            "visibilityPriority": 3,
            "fullName": "What Type of Test",
            "list": "testTypes",
            "required": true,
            "description": "The type of home test.",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visible": true
          },
          "testResult": {
            "type": "String",
            "visibilityPriority": 4,
            "fullName": "Test Result",
            "validate": [
              {
                "validator": "maxLength",
                "arguments": {
                  "length": "100"
                },
                "errorMessages": {
                  "default": "Value is too long, should be at most $length characters long"
                }
              }
            ],
            "required": true,
            "description": "Value of the home lab test.",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visible": true
          },
          "resultUnit": {
            "type": "String",
            "fullName": "Test Result Unit",
            "visibilityPriority": 5,
            "visible": false,
            "list": "resultsUnits",
            "description": "The type of units measured in home test.",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ]
          },
          "comments": {
            "type": "String",
            "fullName": "Lab Test  Comments",
            "validate": [
              {
                "validator": "maxLength",
                "arguments": {
                  "length": "500"
                },
                "errorMessages": {
                  "default": "Value is too long, should be at most $length characters long"
                }
              }
            ],
            "visibilityPriority": 6,
            "description": "Describe anything to do with this test.",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visible": true
          },
          "sourceType": {
            "type": "String",
            "list": "sourceHLTypes",
            "required": false,
            "visible": false,
            "visibilityPriority": 7,
            "fullName": "Source of Record",
            "description": "The source of the patient data.",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ]
          },
          "_id": {
            "type": "ObjectID",
            "visible": false,
            "generated": true,
            "fullName": "Subschema element id",
            "description": "Subschema element id",
            "generatorSpecification": [
              "_id()"
            ]
          }
        },
        "limitReturnedRecords": 0
      },
      "labTests": {
        "type": "Subschema",
        "fullName": "Lab Tests",
        "requiresAuthentication": true,
        "defaultSortBy": {
          "collectionDate": -1
        },
        "fields": {
          "sourceType": {
            "type": "String",
            "list": "sourceTypes",
            "fullName": "Source of Record",
            "required": false,
            "visible": false,
            "description": "The source of the patient data (e.g., hospital, clinic, etc.,).",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visibilityPriority": 100
          },
          "testName": {
            "type": "String",
            "visibilityPriority": 2,
            "validate": [
              {
                "validator": "maxLength",
                "arguments": {
                  "length": "10"
                },
                "errorMessages": {
                  "default": "Value is too long, should be at most $length characters long"
                }
              }
            ],
            "list": "testNames",
            "fullName": "Test Name",
            "required": true,
            "description": "The name of the lab test performed.",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visible": true
          },
          "resultDate": {
            "type": "Date",
            "fullName": "Result Date",
            "required": true,
            "description": "The date that the lab results were complete.",
            "validate": [
              {
                "validator": "min",
                "arguments": {
                  "limit": "$collectionDate"
                },
                "errorMessages": {
                  "default": "Value $val is too small, should be greater than @limit",
                  "date": "Date $val should be after @limit (#limit)"
                }
              },
              {
                "validator": "notInFuture",
                "arguments": {},
                "errorMessages": {
                  "default": "This date cannot be in the future"
                }
              }
            ],
            "width": 85,
            "visible": true,
            "visibilityPriority": 100
          },
          "originalResult": {
            "type": "String",
            "validate": [
              {
                "validator": "maxLength",
                "arguments": {
                  "length": "100"
                },
                "errorMessages": {
                  "default": "Value is too long, should be at most $length characters long"
                }
              }
            ],
            "fullName": "Original Result",
            "required": true,
            "description": "The original result of the lab test.",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visible": true,
            "visibilityPriority": 100
          },
          "originalResultUnit": {
            "type": "String",
            "fullName": "Original Result Unit",
            "required": true,
            "list": "resultsUnits",
            "description": "Original units for the test result, as reported in source data.",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visible": true,
            "visibilityPriority": 100
          },
          "resultType": {
            "type": "String",
            "list": "resultTypes",
            "fullName": "Result Type",
            "visible": false,
            "description": "The results of the lab test performed.",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visibilityPriority": 100
          },
          "testSubCategory": {
            "type": "String",
            "visible": false,
            "list": "testSubCategories",
            "fullName": "Test Sub Category",
            "description": "Sub-category for MS_Test_Name. Sub-categories apply to only select laboratory tests. ‘DIRECT’ and ‘CALCULATED’ is only populated for MS_Test_Name = CHOL_LDL. ‘DDU’ and ‘FEU’ is only populated for MS_Test_Name = D_DIMER, Result_Type = N. ‘BHCG’ AND ‘HCG’ is only populated for MS_Test_Name = PG. ",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visibilityPriority": 100
          },
          "fastingIndicator": {
            "type": "String",
            "list": "fastingIndicators",
            "fullName": "Fasting Indicator",
            "description": "Indicates whether the patient fasted before the specimen was given/taken.",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visible": true,
            "visibilityPriority": 100
          },
          "specimenSource": {
            "type": "String",
            "required": true,
            "list": "specimenSources",
            "fullName": "",
            "description": "From where was the sample taken.",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visible": true,
            "visibilityPriority": 100
          },
          "loincCode": {
            "type": "String",
            "list": "loincCodes",
            "visible": false,
            "fullName": "Specimen Source",
            "description": "Identifies the source of the specimen (e.g., urine, feces, mucus, blood, etc.).",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visibilityPriority": 100
          },
          "testImmediacy": {
            "type": "String",
            "list": "testImmediacyTypes",
            "fullName": "Test Immediacy",
            "visible": false,
            "description": "Immediacy of test. The intent of this variable is to determine whether the test was obtained as part of routine care or as an emergent/urgent diagnostic test (designated as Stat or Expedite). ",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visibilityPriority": 100
          },
          "patientLocation": {
            "type": "String",
            "list": "patientLocationTypes",
            "fullName": "Patient Location",
            "description": "The location whether the patient gave the specimen.",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visible": true,
            "visibilityPriority": 100
          },
          "resultLocation": {
            "type": "String",
            "fullName": "Processing Laboratory",
            "description": "The lab where the lab test was performed?",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visible": true,
            "visibilityPriority": 100
          },
          "testLocalCode": {
            "type": "String",
            "fullName": "Test Local Code",
            "visible": false,
            "description": "Local code (non-LOINC) related to an individual lab test. Values for LOCAL_CD are not required. LOCAL_CD is only populated if available in source data. This variable will not be used in queries, but may be used by local programmers to identify and extractToDataPump the required CDM tests.",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visibilityPriority": 100
          },
          "testBatteryCode": {
            "type": "String",
            "fullName": "Test Battery Code",
            "visible": false,
            "description": "Local code (non-LOINC) related to a battery or panel of lab tests. Values for BATTERY_CD are not required. BATTERY_CD is only populated if available in source data. This variable will not be used in queries, but may be used by local programmers to identify and extractToDataPump the required CDM tests.",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visibilityPriority": 100
          },
          "procedureCode": {
            "type": "String",
            "fullName": "Procedure Code",
            "visible": false,
            "description": "A code that identifies the type of lab procedures performed on the patient's specimen.",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visibilityPriority": 100
          },
          "procedureCodeType": {
            "type": "String",
            "visible": false,
            "list": "encountersLabtestsProcedureCodeTypes",
            "fullName": "Procedure Code Type",
            "description": "Identifies the procedure grouping type.",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visibilityPriority": 100
          },
          "orderingProviderDepartment": {
            "type": "String",
            "fullName": "Ordering Provider Department",
            "validate": [
              {
                "validator": "maxLength",
                "arguments": {
                  "length": "200"
                },
                "errorMessages": {
                  "default": "Value is too long, should be at most $length characters long"
                }
              }
            ],
            "description": "The healthcare provider's department that order the lab test. ",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visible": true,
            "visibilityPriority": 100
          },
          "orderDate": {
            "type": "Date",
            "visibilityPriority": 1,
            "fullName": "Order Date",
            "description": "The date the lab test was ordered by the healthcare professional.",
            "validate": [
              {
                "validator": "notInFuture",
                "arguments": {},
                "errorMessages": {
                  "default": "This date cannot be in the future"
                }
              }
            ],
            "width": 85,
            "visible": true
          },
          "collectionDate": {
            "type": "Date",
            "fullName": "Collection Date",
            "description": "The date the specimen was collected from the patient.",
            "validate": [
              {
                "validator": "min",
                "arguments": {
                  "limit": "$orderDate"
                },
                "errorMessages": {
                  "default": "Value $val is too small, should be greater than @limit",
                  "date": "Date $val should be after @limit (#limit)"
                }
              },
              {
                "validator": "notInFuture",
                "arguments": {},
                "errorMessages": {
                  "default": "This date cannot be in the future"
                }
              }
            ],
            "width": 85,
            "visible": true,
            "visibilityPriority": 100
          },
          "resultValueC": {
            "type": "String",
            "validate": [
              {
                "validator": "maxLength",
                "arguments": {
                  "length": "50"
                },
                "errorMessages": {
                  "default": "Value is too long, should be at most $length characters long"
                }
              }
            ],
            "fullName": "Result Value C",
            "visible": false,
            "description": "This standardized result value is only populated for text or character results (Result_Type = C) and is null for numeric results (Result_Type = N). If Result_Type = “C” and the source result is a range (e.g., 50-100 mg/mL), then populate MS_Result_C using Orig_Result with the start and end values of the range delimited by a vertical bar (e.g., '50-100 mg/mL' becomes '50|100 mg/mL'). ",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visibilityPriority": 100
          },
          "resultValueN": {
            "type": "Number",
            "fullName": "Result Value N",
            "visible": false,
            "description": "Standardized/converted numeric result for records where Result_Type=N. Acceptable values are numeric digits with or without a decimal ('.'). If the standardized result unit (STD_RESULT_UNIT) differs from an acceptable MS_RESULT_UNIT for a numeric test (RESULT_TYPE=N), then ORIG_RESULT is converted prior to populating the MS_RESULT_N value. Additionally, MS_RESULT_UNIT reflects this conversion. This variable is only populated for numeric results (RESULT_TYPE = N) and does not contain negative values. This variable is null for text/character results (RESULT_TYPE = C).",
            "width": 30,
            "visibilityPriority": 100
          },
          "modifier": {
            "type": "String",
            "validate": [
              {
                "validator": "maxLength",
                "arguments": {
                  "length": "2"
                },
                "errorMessages": {
                  "default": "Value is too long, should be at most $length characters long"
                }
              }
            ],
            "list": "labTestModifiers",
            "fullName": "Modifier",
            "visible": false,
            "description": "Modifier for result values. Any relational operators in the original source data value (e.g., <, >, or =) are reflected in the Modifier variable. For example, if the original source data value is '<=200', then Orig_Result = 200 and Modifier = ‘LE’. If the original source data result value is text, then Modifier = TX. If the original source data result value is numeric (digits with or without decimal) and does not contain an operator, then Modifier = EQ.",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visibilityPriority": 100
          },
          "standardizedResultUnitC": {
            "type": "String",
            "validate": [
              {
                "validator": "maxLength",
                "arguments": {
                  "length": "11"
                },
                "errorMessages": {
                  "default": "Value is too long, should be at most $length characters long"
                }
              }
            ],
            "fullName": "Standardized Result Unit C",
            "visible": false,
            "description": "Standardized units for the result. The purpose of STD_RESULT_UNIT is to modify ORIG_RESULT_UNIT from free text to a standardized unit, as an intermediary step in converting from ORIG_RESULT_UNIT to MS_RESULT_UNIT. This variable is only populated for records where Result_type = N. Common rules and guidelines for populating STD_RESULT_UNIT, include: converting all text values for ORIG_RESULT_UNIT to uppercase, and using standard abbreviations as provided by SOC. This variable does not include special characters, unless that character is part of the unit. For example, special characters are included in '10^9/L'. However, special characters are not included in '^U/L^', as these carats are not part of the unit value. This value is not usually null, though there are exceptions, such as when the test result is a ratio (e.g., International Normalized Ratio [INR]). This value is null for character tests (Result_Type=C) until that test has been reviewed and characterized by the Clinical Data Elements Workgroup.",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visibilityPriority": 100
          },
          "standardizedResultUnitN": {
            "type": "String",
            "validate": [
              {
                "validator": "maxLength",
                "arguments": {
                  "length": "11"
                },
                "errorMessages": {
                  "default": "Value is too long, should be at most $length characters long"
                }
              }
            ],
            "fullName": "Standardized Result Unit N",
            "visible": false,
            "description": "Converted/standardized result units for the value populated in MS_RESULT_N. This value is null for records where Result_Type = C, and null for Laboratory Tests that have not been characterized and reviewed by the Clinical Data Elements Workgroup. This value may be null for some numeric tests (e.g., as International Normalized Ratio [INR] is a ratio, it does not have a result unit). For tests that require a result unit, MS_RESULT_UNIT is set to 'UNKNOWN' for all records where the original result unit is missing or blank, 'NULL', 'N/A', 'NA', or 'UNK.' Guidance is provided for only Laboratory Tests that have been reviewed by the Clinical Data Elements Workgroup.",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visibilityPriority": 100
          },
          "normalRangeLow": {
            "type": "String",
            "validate": [
              {
                "validator": "maxLength",
                "arguments": {
                  "length": "8"
                },
                "errorMessages": {
                  "default": "Value is too long, should be at most $length characters long"
                }
              }
            ],
            "fullName": "Normal Range Low",
            "visible": false,
            "description": "Lower bound of the normal reference range, as assigned by the laboratory. The normal range associated with a test, as assigned by the laboratory is parsed out into the following variables: NORM_RANGE_LOW, MODIFIER_LOW, NORM_RANGE_HIGH, MODIFIER_HIGH, and reflects what is seen in source data. Value only contains the value of the lower bound of the normal reference range. This value is not converted and unit of measure is not included. It is assumed that the associated unit is the same as the original result unit from the source data. The symbols >, <, >=, <= are removed. For example, if the normal range for a test is >100 and <300, then '100' is entered. Additionally, this value is null for records where Result_Type = C.",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visibilityPriority": 100
          },
          "normalRangeLowModifier": {
            "type": "String",
            "validate": [
              {
                "validator": "maxLength",
                "arguments": {
                  "length": "2"
                },
                "errorMessages": {
                  "default": "Value is too long, should be at most $length characters long"
                }
              }
            ],
            "list": "labTestLowModifiers",
            "fullName": "Normal Range Low Modifier",
            "visible": false,
            "description": "Modifier for Norm_Range_low values. The normal range associated with a test, as assigned by the laboratory is parsed out into the following variables: NORM_RANGE_LOW, MODIFIER_LOW, NORM_RANGE_HIGH, MODIFIER_HIGH and reflects what is seen in source data. This value is null for records where Result_Type=C. For numeric results one of the following needs to be true:  1) Both Modifier_low and Modifier_high contain EQ (e.g., normal values fall in the range 3-10).  2) Modifier_low contains GT or GE and Modifier_high is null (e.g., normal values are >3 with no upper boundary).  3) Modifier_high contains LT or LE and Modifier_low is null (e.g., normal values are <=10 with no lower boundary).",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visibilityPriority": 100
          },
          "normalRangeHigh": {
            "type": "String",
            "validate": [
              {
                "validator": "maxLength",
                "arguments": {
                  "length": "8"
                },
                "errorMessages": {
                  "default": "Value is too long, should be at most $length characters long"
                }
              }
            ],
            "fullName": "Normal Range High",
            "visible": false,
            "description": "Upper bound of the normal reference range, as assigned by the laboratory. The normal range associated with a test, as assigned by the laboratory is parsed out into the following variables: NORM_RANGE_LOW, MODIFIER_LOW, NORM_RANGE_HIGH, MODIFIER_HIGH and reflects what is seen in source data. Value only contains the value of the upper bound of the normal reference range. This value is not converted and unit of measure is not included.  It is assumed that the associated unit is the same as the original result unit from source data. The symbols >, <, >=, <= are removed. For example, if the normal range for a test is >100 and <300, then '100' is entered. Additionally, this value is null for records where Result_Type = C.",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visibilityPriority": 100
          },
          "normalRangeHighModifier": {
            "type": "String",
            "validate": [
              {
                "validator": "maxLength",
                "arguments": {
                  "length": "2"
                },
                "errorMessages": {
                  "default": "Value is too long, should be at most $length characters long"
                }
              }
            ],
            "list": "labTestHighModifiers",
            "fullName": "Normal Range High Modifier",
            "visible": false,
            "description": "Modifier for Norm_Range_high values. The normal range associated with a test, as assigned by the laboratory is parsed out into the following variables: NORM_RANGE_LOW, MODIFIER_LOW, NORM_RANGE_HIGH, MODIFIER_HIGH and reflects what is seen in source data. The value is null for records where Result_Type=C. For numeric results one of the following needs to be true:  1) Both Modifier_low and Modifier_high contain EQ (e.g., normal values fall in the range 3-10).  2) Modifier_low contains GT or GE and Modifier_high is null (e.g., normal values are >3 with no upper boundary).  3) Modifier_high contains LT or LE and Modifier_low is null (e.g., normal values are <=10 with no lower boundary).",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visibilityPriority": 100
          },
          "abnormalResultIndicator": {
            "type": "String",
            "validate": [
              {
                "validator": "maxLength",
                "arguments": {
                  "length": "2"
                },
                "errorMessages": {
                  "default": "Value is too long, should be at most $length characters long"
                }
              }
            ],
            "list": "abnormalResultIndicators",
            "fullName": "Abnormal Result Indicator",
            "visible": false,
            "description": "Indicator that identifies when a result is outside the normal range.",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visibilityPriority": 100
          },
          "facilityCode": {
            "type": "String",
            "fullName": "Facility Code",
            "visible": false,
            "description": "The unique code that identifies the healthcare facility.",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visibilityPriority": 100
          },
          "_id": {
            "type": "ObjectID",
            "visible": false,
            "generated": true,
            "fullName": "Subschema element id",
            "description": "Subschema element id",
            "generatorSpecification": [
              "_id()"
            ]
          }
        },
        "limitReturnedRecords": 0
      },
      "medicationAdherences": {
        "type": "Subschema",
        "fullName": "Tracking Medications",
        "requiresAuthentication": true,
        "defaultSortBy": {
          "resultDate": -1
        },
        "fields": {
          "resultDate": {
            "type": "Date",
            "visibilityPriority": 1,
            "fullName": "Entry Date",
            "required": true,
            "description": "Date medication taken.",
            "validate": [
              {
                "validator": "notInFuture",
                "arguments": {},
                "errorMessages": {
                  "default": "This date cannot be in the future"
                }
              }
            ],
            "width": 85,
            "visible": true
          },
          "timeOfDay": {
            "type": "String",
            "fullName": "Time of Day",
            "visibilityPriority": 3,
            "list": "dayTime",
            "required": true,
            "description": "Pick the time of the day when you took your medications.",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visible": true
          },
          "allMedicationsTaken": {
            "type": "Boolean",
            "visibilityPriority": 3,
            "fullName": "Take All Medications",
            "description": "Select if all medications have been taken for this session.",
            "width": 20,
            "visible": true
          },
          "numberMedicationsTaken": {
            "type": "Number",
            "visibilityPriority": 4,
            "fullName": "Number of Medications Taken",
            "description": "Indicates all medications scheduled were taken.",
            "validate": [
              {
                "validator": "max",
                "arguments": {
                  "limit": "99"
                },
                "errorMessages": {
                  "default": "Value $val is too large, should be less than @limit",
                  "date": "Date $val should be before @limit (#limit)"
                }
              }
            ],
            "width": 30,
            "visible": true
          },
          "comments": {
            "type": "String",
            "visibilityPriority": 5,
            "validate": [
              {
                "validator": "maxLength",
                "arguments": {
                  "length": "500"
                },
                "errorMessages": {
                  "default": "Value is too long, should be at most $length characters long"
                }
              }
            ],
            "fullName": "Comments",
            "description": "Describe anything of interest about taking your medications.",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visible": true
          },
          "_id": {
            "type": "ObjectID",
            "visible": false,
            "generated": true,
            "fullName": "Subschema element id",
            "description": "Subschema element id",
            "generatorSpecification": [
              "_id()"
            ]
          }
        },
        "limitReturnedRecords": 0
      },
      "moods": {
        "type": "Subschema",
        "fullName": "How Am I Feeling",
        "requiresAuthentication": true,
        "defaultSortBy": {
          "dateMood": -1,
          "time": -1
        },
        "fields": {
          "dateMood": {
            "type": "Date",
            "visibilityPriority": 1,
            "fullName": "Entry Date",
            "required": true,
            "description": "Date of mood entry.",
            "validate": [
              {
                "validator": "notInFuture",
                "arguments": {},
                "errorMessages": {
                  "default": "This date cannot be in the future"
                }
              }
            ],
            "width": 85,
            "visible": true
          },
          "time": {
            "type": "String",
            "visibilityPriority": 2,
            "fullName": "Time of Day",
            "list": "dayTime",
            "required": true,
            "description": "Pick the time of the day you were in this mood.",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visible": true
          },
          "moodType": {
            "type": "String",
            "visibilityPriority": 3,
            "fullName": "Your Mood",
            "list": "moodTypes",
            "required": true,
            "description": "Choose your mood at the time.",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visible": true
          },
          "comments": {
            "type": "String",
            "visibilityPriority": 4,
            "validate": [
              {
                "validator": "maxLength",
                "arguments": {
                  "length": "500"
                },
                "errorMessages": {
                  "default": "Value is too long, should be at most $length characters long"
                }
              }
            ],
            "fullName": "Mood Comments",
            "description": "Describe your mood.",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visible": true
          },
          "_id": {
            "type": "ObjectID",
            "visible": false,
            "generated": true,
            "fullName": "Subschema element id",
            "description": "Subschema element id",
            "generatorSpecification": [
              "_id()"
            ]
          }
        },
        "limitReturnedRecords": 0
      },
      "myAdverseEvents": {
        "type": "Subschema",
        "fullName": "My Adverse Events",
        "requiresAuthentication": true,
        "defaultSortBy": {
          "date": -1
        },
        "fields": {
          "subject": {
            "type": "String",
            "visibilityPriority": 2,
            "fullName": "Subject",
            "description": "Short description of the adverse event.",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visible": true
          },
          "details": {
            "type": "String",
            "fullName": "Description",
            "description": "Adverse event Details.",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visible": true,
            "visibilityPriority": 100
          },
          "eventId": {
            "type": "ObjectID",
            "required": true,
            "unique": true,
            "fullName": "Adverse Event ID",
            "description": "ID of the adverse event in the global adverse events collection.",
            "lookup": {
              "table": "adverseEvents",
              "foreignKey": "_id",
              "label": "subject",
              "id": "adverseEventId"
            },
            "width": 120,
            "transform": [
              [
                "addLookupDetails",
                null
              ]
            ],
            "visible": true,
            "visibilityPriority": 100
          },
          "productName": {
            "type": "String",
            "fullName": "Product Name",
            "description": "Product Name.",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visible": true,
            "visibilityPriority": 100
          },
          "productType": {
            "type": "String",
            "fullName": "Product Type",
            "description": "Product Type.",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visible": true,
            "visibilityPriority": 100
          },
          "date": {
            "type": "Date",
            "visibilityPriority": 1,
            "fullName": "Posted Date",
            "description": "The date when the alert was posted.",
            "width": 85,
            "visible": true
          },
          "_id": {
            "type": "ObjectID",
            "visible": false,
            "generated": true,
            "fullName": "Subschema element id",
            "description": "Subschema element id",
            "generatorSpecification": [
              "_id()"
            ]
          }
        },
        "limitReturnedRecords": 0
      },
      "myBiologics": {
        "type": "Subschema",
        "fullName": "My Biologic Products",
        "defaultSortBy": {
          "start": -1
        },
        "fields": {
          "productId": {
            "type": "ObjectID",
            "fullName": "Product Name",
            "visibilityPriority": 1,
            "description": "Name of the biological product.",
            "required": true,
            "lookup": {
              "table": "productsBiologics",
              "foreignKey": "_id",
              "label": "name",
              "id": "biologicId"
            },
            "width": 120,
            "transform": [
              [
                "addLookupDetails",
                null
              ]
            ],
            "visible": true
          },
          "frequencyTaken": {
            "type": "String",
            "required": true,
            "list": "usageFrequency",
            "fullName": "Frequency Product Taken",
            "description": "Number of times to use a product in a given 24 hour period",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visible": true,
            "visibilityPriority": 100
          },
          "dosage": {
            "type": "Number",
            "required": true,
            "fullName": "Prescribed Dosage",
            "description": "The dosage of this biologic (amount of each dose).",
            "width": 30,
            "visible": true,
            "visibilityPriority": 100
          },
          "dosageUnits": {
            "type": "String",
            "list": "units",
            "required": true,
            "fullName": "Dosage Units",
            "description": "The dosage units of this medication.",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visible": true,
            "visibilityPriority": 100
          },
          "route": {
            "type": "String",
            "required": true,
            "list": "routesOfAdministration",
            "fullName": "Route of Administration",
            "description": "Administration route of the biologic.",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visible": true,
            "visibilityPriority": 100
          },
          "prescribed": {
            "type": "Date",
            "fullName": "Prescription Date",
            "description": "Date prescription was issued.",
            "validate": [
              {
                "validator": "notInFuture",
                "arguments": {},
                "errorMessages": {
                  "default": "This date cannot be in the future"
                }
              }
            ],
            "width": 85,
            "visible": true,
            "visibilityPriority": 100
          },
          "start": {
            "type": "Date",
            "fullName": "Product Start Date",
            "description": "Date product usage began.",
            "validate": [
              {
                "validator": "notInFuture",
                "arguments": {},
                "errorMessages": {
                  "default": "This date cannot be in the future"
                }
              },
              {
                "validator": "min",
                "arguments": {
                  "limit": "$prescribed"
                },
                "errorMessages": {
                  "default": "Value $val is too small, should be greater than @limit",
                  "date": "Date $val should be after @limit (#limit)"
                }
              }
            ],
            "width": 85,
            "visible": true,
            "visibilityPriority": 100
          },
          "end": {
            "type": "Date",
            "fullName": "Product End Date",
            "description": "Date product usage ended.",
            "validate": [
              {
                "validator": "min",
                "arguments": {
                  "limit": "$start"
                },
                "errorMessages": {
                  "default": "Value $val is too small, should be greater than @limit",
                  "date": "Date $val should be after @limit (#limit)"
                }
              },
              {
                "validator": "notInFuture",
                "arguments": {},
                "errorMessages": {
                  "default": "This date cannot be in the future"
                }
              }
            ],
            "width": 85,
            "visible": true,
            "visibilityPriority": 100
          },
          "supply": {
            "type": "Number",
            "fullName": "Amount in Prescription",
            "description": "Amount of product included in prescription.",
            "validate": [
              {
                "validator": "min",
                "arguments": {
                  "limit": "1"
                },
                "errorMessages": {
                  "default": "Value $val is too small, should be greater than @limit",
                  "date": "Date $val should be after @limit (#limit)"
                }
              },
              {
                "validator": "max",
                "arguments": {
                  "limit": "999"
                },
                "errorMessages": {
                  "default": "Value $val is too large, should be less than @limit",
                  "date": "Date $val should be before @limit (#limit)"
                }
              }
            ],
            "width": 30,
            "visible": true,
            "visibilityPriority": 100
          },
          "lot": {
            "type": "String",
            "fullName": "Biologic Lot",
            "description": "The manufacturer's lot number listed on the product used.",
            "validate": [
              {
                "validator": "maxLength",
                "arguments": {
                  "length": "100"
                },
                "errorMessages": {
                  "default": "Value is too long, should be at most $length characters long"
                }
              }
            ],
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visible": true,
            "visibilityPriority": 100
          },
          "_id": {
            "type": "ObjectID",
            "visible": false,
            "generated": true,
            "fullName": "Subschema element id",
            "description": "Subschema element id",
            "generatorSpecification": [
              "_id()"
            ]
          }
        },
        "limitReturnedRecords": 0,
        "requiresAuthentication": true
      },
      "myDevices": {
        "type": "Subschema",
        "fullName": "My Medical Devices",
        "defaultSortBy": {
          "start": -1
        },
        "fields": {
          "productId": {
            "type": "ObjectID",
            "fullName": "Product Name",
            "visibilityPriority": 1,
            "description": "Name of the medical device.",
            "required": true,
            "lookup": {
              "table": "productsDevices",
              "foreignKey": "_id",
              "label": "name",
              "id": "deviceId"
            },
            "width": 120,
            "transform": [
              [
                "addLookupDetails",
                null
              ]
            ],
            "visible": true
          },
          "deviceUsage": {
            "type": "String",
            "list": "deviceUsage",
            "required": true,
            "fullName": "Usage Pattern for Device",
            "description": "How is the device used (continuously, daily, as needed, etc)",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visible": true,
            "visibilityPriority": 100
          },
          "prescribed": {
            "type": "Date",
            "fullName": "Prescription Date",
            "description": "Date prescription was issued.",
            "validate": [
              {
                "validator": "notInFuture",
                "arguments": {},
                "errorMessages": {
                  "default": "This date cannot be in the future"
                }
              }
            ],
            "width": 85,
            "visible": true,
            "visibilityPriority": 100
          },
          "start": {
            "type": "Date",
            "fullName": "Product Start Date",
            "description": "Date product usage began.",
            "validate": [
              {
                "validator": "min",
                "arguments": {
                  "limit": "$prescribed"
                },
                "errorMessages": {
                  "default": "Value $val is too small, should be greater than @limit",
                  "date": "Date $val should be after @limit (#limit)"
                }
              },
              {
                "validator": "notInFuture",
                "arguments": {},
                "errorMessages": {
                  "default": "This date cannot be in the future"
                }
              }
            ],
            "width": 85,
            "visible": true,
            "visibilityPriority": 100
          },
          "end": {
            "type": "Date",
            "fullName": "Product End Date",
            "description": "Date product usage ended.",
            "validate": [
              {
                "validator": "min",
                "arguments": {
                  "limit": "$start"
                },
                "errorMessages": {
                  "default": "Value $val is too small, should be greater than @limit",
                  "date": "Date $val should be after @limit (#limit)"
                }
              },
              {
                "validator": "notInFuture",
                "arguments": {},
                "errorMessages": {
                  "default": "This date cannot be in the future"
                }
              }
            ],
            "width": 85,
            "visible": true,
            "visibilityPriority": 100
          },
          "lot": {
            "type": "String",
            "fullName": "Device Product Lot",
            "description": "The manufacturer's lot number listed on the product used.",
            "validate": [
              {
                "validator": "maxLength",
                "arguments": {
                  "length": "100"
                },
                "errorMessages": {
                  "default": "Value is too long, should be at most $length characters long"
                }
              }
            ],
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visible": true,
            "visibilityPriority": 100
          },
          "serialNumber": {
            "type": "String",
            "fullName": "Device Serial Number",
            "validate": [
              {
                "validator": "maxLength",
                "arguments": {
                  "length": "100"
                },
                "errorMessages": {
                  "default": "Value is too long, should be at most $length characters long"
                }
              }
            ],
            "description": "The manufacturer's serial number listed on the product.",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visible": true,
            "visibilityPriority": 100
          },
          "_id": {
            "type": "ObjectID",
            "visible": false,
            "generated": true,
            "fullName": "Subschema element id",
            "description": "Subschema element id",
            "generatorSpecification": [
              "_id()"
            ]
          }
        },
        "limitReturnedRecords": 0,
        "requiresAuthentication": true
      },
      "myMedications": {
        "type": "Subschema",
        "fullName": "My Medications",
        "limitReturnedRecords": 30,
        "defaultSortBy": {
          "start": -1
        },
        "fields": {
          "productId": {
            "type": "ObjectID",
            "visibilityPriority": 1,
            "fullName": "Product Name",
            "description": "Name of the medication.",
            "required": true,
            "lookup": {
              "table": "productsMedications",
              "foreignKey": "_id",
              "label": "name",
              "id": "medicationId"
            },
            "width": 120,
            "transform": [
              [
                "addLookupDetails",
                null
              ]
            ],
            "visible": true
          },
          "frequencyTaken": {
            "type": "String",
            "required": true,
            "list": "usageFrequency",
            "fullName": "Frequency Product Taken",
            "description": "Number of times to use a product in a given period.",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visible": true,
            "visibilityPriority": 100
          },
          "dosage": {
            "type": "Number",
            "required": true,
            "fullName": "Prescribed Dosage",
            "description": "The dosage of this medication (amount of medication).",
            "validate": [
              {
                "validator": "max",
                "arguments": {
                  "limit": "1000"
                },
                "errorMessages": {
                  "default": "Value $val is too large, should be less than @limit",
                  "date": "Date $val should be before @limit (#limit)"
                }
              }
            ],
            "width": 30,
            "visible": true,
            "visibilityPriority": 100
          },
          "dosageUnits": {
            "type": "String",
            "list": "units",
            "required": true,
            "fullName": "Dosage Units",
            "description": "The dosage units of this medication.",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visible": true,
            "visibilityPriority": 100
          },
          "route": {
            "type": "String",
            "required": true,
            "list": "routesOfAdministration",
            "fullName": "Route of Administration",
            "description": "Administration route of the product",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visible": true,
            "visibilityPriority": 100
          },
          "prescribed": {
            "type": "Date",
            "fullName": "Prescription Date",
            "description": "Date prescription was issued.",
            "validate": [
              {
                "validator": "notInFuture",
                "arguments": {},
                "errorMessages": {
                  "default": "This date cannot be in the future"
                }
              }
            ],
            "width": 85,
            "visible": true,
            "visibilityPriority": 100
          },
          "start": {
            "type": "Date",
            "fullName": "Product Start Date",
            "description": "Date product usage began.",
            "validate": [
              {
                "validator": "min",
                "arguments": {
                  "limit": "$prescribed"
                },
                "errorMessages": {
                  "default": "Value $val is too small, should be greater than @limit",
                  "date": "Date $val should be after @limit (#limit)"
                }
              },
              {
                "validator": "notInFuture",
                "arguments": {},
                "errorMessages": {
                  "default": "This date cannot be in the future"
                }
              }
            ],
            "width": 85,
            "visible": true,
            "visibilityPriority": 100
          },
          "end": {
            "type": "Date",
            "fullName": "Product End Date",
            "description": "Date product usage ended.",
            "validate": [
              {
                "validator": "min",
                "arguments": {
                  "limit": "$start"
                },
                "errorMessages": {
                  "default": "Value $val is too small, should be greater than @limit",
                  "date": "Date $val should be after @limit (#limit)"
                }
              },
              {
                "validator": "notInFuture",
                "arguments": {},
                "errorMessages": {
                  "default": "This date cannot be in the future"
                }
              }
            ],
            "width": 85,
            "visible": true,
            "visibilityPriority": 100
          },
          "supply": {
            "type": "Number",
            "fullName": "Amount in Prescription",
            "description": "Amount of product included in prescription.",
            "validate": [
              {
                "validator": "max",
                "arguments": {
                  "limit": "999"
                },
                "errorMessages": {
                  "default": "Value $val is too large, should be less than @limit",
                  "date": "Date $val should be before @limit (#limit)"
                }
              }
            ],
            "width": 30,
            "visible": true,
            "visibilityPriority": 100
          },
          "lot": {
            "type": "String",
            "fullName": "Medication Lot",
            "description": "The manufacturer's lot number listed on the product used.",
            "validate": [
              {
                "validator": "maxLength",
                "arguments": {
                  "length": "100"
                },
                "errorMessages": {
                  "default": "Value is too long, should be at most $length characters long"
                }
              }
            ],
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visible": true,
            "visibilityPriority": 100
          },
          "_id": {
            "type": "ObjectID",
            "visible": false,
            "generated": true,
            "fullName": "Subschema element id",
            "description": "Subschema element id",
            "generatorSpecification": [
              "_id()"
            ]
          }
        },
        "requiresAuthentication": true
      },
      "myRecalls": {
        "type": "Subschema",
        "fullName": "My Recalls",
        "requiresAuthentication": true,
        "defaultSortBy": {
          "date": -1
        },
        "fields": {
          "subject": {
            "type": "String",
            "visibilityPriority": 1,
            "fullName": "Subject",
            "description": "Short description of the recall.",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visible": true
          },
          "details": {
            "type": "String",
            "fullName": "Description",
            "description": "Recall details.",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visible": true,
            "visibilityPriority": 100
          },
          "eventId": {
            "type": "ObjectID",
            "required": true,
            "fullName": "Recall ID",
            "description": "ID of the recall in the global recalls collection.",
            "unique": true,
            "lookup": {
              "table": "recalls",
              "foreignKey": "_id",
              "label": "subject",
              "id": "recallId"
            },
            "width": 120,
            "transform": [
              [
                "addLookupDetails",
                null
              ]
            ],
            "visible": true,
            "visibilityPriority": 100
          },
          "productName": {
            "type": "String",
            "fullName": "Product Name",
            "description": "Product Name.",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visible": true,
            "visibilityPriority": 100
          },
          "productType": {
            "type": "String",
            "fullName": "Product Type",
            "description": "Product Type.",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visible": true,
            "visibilityPriority": 100
          },
          "date": {
            "type": "Date",
            "fullName": "Posted Date",
            "description": "The date when the alert was posted.",
            "width": 85,
            "visible": true,
            "visibilityPriority": 100
          },
          "_id": {
            "type": "ObjectID",
            "visible": false,
            "generated": true,
            "fullName": "Subschema element id",
            "description": "Subschema element id",
            "generatorSpecification": [
              "_id()"
            ]
          }
        },
        "limitReturnedRecords": 0
      },
      "mySupplements": {
        "type": "Subschema",
        "fullName": "My Dietary Supplements",
        "defaultSortBy": {
          "start": -1
        },
        "fields": {
          "productId": {
            "type": "ObjectID",
            "fullName": "Product Name",
            "description": "Name on supplement label.",
            "visibilityPriority": 1,
            "required": true,
            "lookup": {
              "table": "productsSupplements",
              "foreignKey": "_id",
              "label": "name",
              "id": "supplementId"
            },
            "width": 120,
            "transform": [
              [
                "addLookupDetails",
                null
              ]
            ],
            "visible": true
          },
          "frequencyTaken": {
            "type": "String",
            "required": true,
            "list": "usageFrequency",
            "fullName": "Frequency Product Taken",
            "description": "Number of times to use a product in a given period.",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visible": true,
            "visibilityPriority": 100
          },
          "dosage": {
            "type": "Number",
            "required": true,
            "fullName": "Dosage Used",
            "description": "Your dosage of this supplement (amount of supplement).",
            "validate": [
              {
                "validator": "max",
                "arguments": {
                  "limit": "1000"
                },
                "errorMessages": {
                  "default": "Value $val is too large, should be less than @limit",
                  "date": "Date $val should be before @limit (#limit)"
                }
              }
            ],
            "width": 30,
            "visible": true,
            "visibilityPriority": 100
          },
          "dosageUnits": {
            "type": "String",
            "list": "units",
            "required": true,
            "fullName": "Dosage Units",
            "description": "The dosage units of this supplement.",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visible": true,
            "visibilityPriority": 100
          },
          "route": {
            "type": "String",
            "required": true,
            "list": "routesOfAdministration",
            "fullName": "Route of Administration",
            "description": "Administration route of the supplement.",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visible": true,
            "visibilityPriority": 100
          },
          "prescribed": {
            "type": "Date",
            "fullName": "Prescription Date",
            "description": "Date prescription was issued. (if applicable)",
            "validate": [
              {
                "validator": "notInFuture",
                "arguments": {},
                "errorMessages": {
                  "default": "This date cannot be in the future"
                }
              }
            ],
            "width": 85,
            "visible": true,
            "visibilityPriority": 100
          },
          "start": {
            "type": "Date",
            "fullName": "Product Start Date",
            "description": "Date product usage began.",
            "validate": [
              {
                "validator": "min",
                "arguments": {
                  "limit": "$prescribed"
                },
                "errorMessages": {
                  "default": "Value $val is too small, should be greater than @limit",
                  "date": "Date $val should be after @limit (#limit)"
                }
              },
              {
                "validator": "notInFuture",
                "arguments": {},
                "errorMessages": {
                  "default": "This date cannot be in the future"
                }
              }
            ],
            "width": 85,
            "visible": true,
            "visibilityPriority": 100
          },
          "end": {
            "type": "Date",
            "fullName": "Product End Date",
            "description": "Date product usage ended.",
            "validate": [
              {
                "validator": "min",
                "arguments": {
                  "limit": "$start"
                },
                "errorMessages": {
                  "default": "Value $val is too small, should be greater than @limit",
                  "date": "Date $val should be after @limit (#limit)"
                }
              },
              {
                "validator": "notInFuture",
                "arguments": {},
                "errorMessages": {
                  "default": "This date cannot be in the future"
                }
              }
            ],
            "width": 85,
            "visible": true,
            "visibilityPriority": 100
          },
          "supply": {
            "type": "Number",
            "fullName": "Quantity in container",
            "description": "Quantity in the container.",
            "validate": [
              {
                "validator": "max",
                "arguments": {
                  "limit": "9999"
                },
                "errorMessages": {
                  "default": "Value $val is too large, should be less than @limit",
                  "date": "Date $val should be before @limit (#limit)"
                }
              }
            ],
            "width": 30,
            "visible": true,
            "visibilityPriority": 100
          },
          "lot": {
            "type": "String",
            "fullName": "Supplement Lot",
            "description": "The manufacturer's lot number listed on the product used.",
            "validate": [
              {
                "validator": "maxLength",
                "arguments": {
                  "length": "100"
                },
                "errorMessages": {
                  "default": "Value is too long, should be at most $length characters long"
                }
              }
            ],
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visible": true,
            "visibilityPriority": 100
          },
          "_id": {
            "type": "ObjectID",
            "visible": false,
            "generated": true,
            "fullName": "Subschema element id",
            "description": "Subschema element id",
            "generatorSpecification": [
              "_id()"
            ]
          }
        },
        "limitReturnedRecords": 0,
        "requiresAuthentication": true
      },
      "myTobaccos": {
        "type": "Subschema",
        "fullName": "My Tobacco Usage",
        "defaultSortBy": {
          "start": -1
        },
        "fields": {
          "productId": {
            "type": "ObjectID",
            "visibilityPriority": 1,
            "fullName": "Product Name",
            "description": "Name of the tobacco product.",
            "required": true,
            "lookup": {
              "table": "productsTobaccos",
              "foreignKey": "_id",
              "label": "name",
              "id": "tobaccoId"
            },
            "width": 120,
            "transform": [
              [
                "addLookupDetails",
                null
              ]
            ],
            "visible": true
          },
          "frequencyTaken": {
            "type": "String",
            "list": "usageFrequency",
            "fullName": "Frequency Product Taken",
            "description": "Number of times to use a product in a given 24 hour period",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visible": true,
            "visibilityPriority": 100
          },
          "route": {
            "type": "String",
            "list": "routesOfAdministration",
            "fullName": "Route of Administration",
            "description": "Administration route of the tobacco product.",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visible": true,
            "visibilityPriority": 100
          },
          "start": {
            "type": "Date",
            "fullName": "Product Start Date",
            "description": "Date product usage began.",
            "validate": [
              {
                "validator": "notInFuture",
                "arguments": {},
                "errorMessages": {
                  "default": "This date cannot be in the future"
                }
              }
            ],
            "width": 85,
            "visible": true,
            "visibilityPriority": 100
          },
          "end": {
            "type": "Date",
            "fullName": "Product End Date",
            "description": "Date product usage ended.",
            "validate": [
              {
                "validator": "min",
                "arguments": {
                  "limit": "$start"
                },
                "errorMessages": {
                  "default": "Value $val is too small, should be greater than @limit",
                  "date": "Date $val should be after @limit (#limit)"
                }
              },
              {
                "validator": "notInFuture",
                "arguments": {},
                "errorMessages": {
                  "default": "This date cannot be in the future"
                }
              }
            ],
            "width": 85,
            "visible": true,
            "visibilityPriority": 100
          },
          "supply": {
            "type": "Number",
            "fullName": "Amount of Nicotine",
            "description": "Amount of Nicotine in a dose of the tobacco product.",
            "validate": [
              {
                "validator": "min",
                "arguments": {
                  "limit": "0.001"
                },
                "errorMessages": {
                  "default": "Value $val is too small, should be greater than @limit",
                  "date": "Date $val should be after @limit (#limit)"
                }
              },
              {
                "validator": "max",
                "arguments": {
                  "limit": "1000"
                },
                "errorMessages": {
                  "default": "Value $val is too large, should be less than @limit",
                  "date": "Date $val should be before @limit (#limit)"
                }
              }
            ],
            "width": 30,
            "visible": true,
            "visibilityPriority": 100
          },
          "lot": {
            "type": "String",
            "fullName": "Tobacco Product Lot",
            "description": "The manufacturer's lot number listed on the product used.",
            "validate": [
              {
                "validator": "maxLength",
                "arguments": {
                  "length": "100"
                },
                "errorMessages": {
                  "default": "Value is too long, should be at most $length characters long"
                }
              }
            ],
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visible": true,
            "visibilityPriority": 100
          },
          "serialNumber": {
            "type": "String",
            "fullName": "Tobacco Device Serial Number",
            "description": "The manufacturer's serial number listed on the product used if an eCigarette or Vaporizer.",
            "validate": [
              {
                "validator": "maxLength",
                "arguments": {
                  "length": "100"
                },
                "errorMessages": {
                  "default": "Value is too long, should be at most $length characters long"
                }
              }
            ],
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visible": true,
            "visibilityPriority": 100
          },
          "_id": {
            "type": "ObjectID",
            "visible": false,
            "generated": true,
            "fullName": "Subschema element id",
            "description": "Subschema element id",
            "generatorSpecification": [
              "_id()"
            ]
          }
        },
        "limitReturnedRecords": 0,
        "requiresAuthentication": true
      },
      "myVaccines": {
        "type": "Subschema",
        "fullName": "My Vaccinations",
        "defaultSortBy": {
          "administered": -1
        },
        "fields": {
          "productId": {
            "type": "ObjectID",
            "visibilityPriority": 1,
            "fullName": "Product Name",
            "description": "Name of the vaccine.",
            "required": true,
            "lookup": {
              "table": "productsVaccines",
              "foreignKey": "_id",
              "label": "tradeName",
              "id": "vaccineId"
            },
            "width": 120,
            "transform": [
              [
                "addLookupDetails",
                null
              ]
            ],
            "visible": true
          },
          "dosage": {
            "type": "Number",
            "fullName": "Prescribed Dosage",
            "description": "The dosage of this vaccine.",
            "validate": [
              {
                "validator": "max",
                "arguments": {
                  "limit": "1000"
                },
                "errorMessages": {
                  "default": "Value $val is too large, should be less than @limit",
                  "date": "Date $val should be before @limit (#limit)"
                }
              }
            ],
            "width": 30,
            "visible": true,
            "visibilityPriority": 100
          },
          "dosageUnits": {
            "type": "String",
            "list": "units",
            "fullName": "Dosage Units",
            "description": "The dosage units of the vaccine.",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visible": true,
            "visibilityPriority": 100
          },
          "route": {
            "type": "String",
            "list": "routesOfAdministration",
            "fullName": "Route of Administration",
            "description": "Administration route of the vaccine.",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visible": true,
            "visibilityPriority": 100
          },
          "prescribed": {
            "type": "Date",
            "fullName": "Prescription Date",
            "description": "Date prescription was issued.",
            "validate": [
              {
                "validator": "notInFuture",
                "arguments": {},
                "errorMessages": {
                  "default": "This date cannot be in the future"
                }
              }
            ],
            "width": 85,
            "visible": true,
            "visibilityPriority": 100
          },
          "administered": {
            "type": "Date",
            "fullName": "Administered Date",
            "description": "Date the vaccine was given.",
            "validate": [
              {
                "validator": "min",
                "arguments": {
                  "limit": "$prescribed"
                },
                "errorMessages": {
                  "default": "Value $val is too small, should be greater than @limit",
                  "date": "Date $val should be after @limit (#limit)"
                }
              },
              {
                "validator": "notInFuture",
                "arguments": {},
                "errorMessages": {
                  "default": "This date cannot be in the future"
                }
              }
            ],
            "width": 85,
            "visible": true,
            "visibilityPriority": 100
          },
          "lot": {
            "type": "String",
            "fullName": "Vaccine Lot",
            "description": "The manufacturer's lot number listed on the product used.",
            "validate": [
              {
                "validator": "maxLength",
                "arguments": {
                  "length": "100"
                },
                "errorMessages": {
                  "default": "Value is too long, should be at most $length characters long"
                }
              }
            ],
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visible": true,
            "visibilityPriority": 100
          },
          "vaccinationAge": {
            "type": "String",
            "fullName": "Age at Vaccination",
            "description": "Enter - Birth, Age in Months or Age in Years.",
            "validate": [
              {
                "validator": "maxLength",
                "arguments": {
                  "length": "3"
                },
                "errorMessages": {
                  "default": "Value is too long, should be at most $length characters long"
                }
              }
            ],
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visible": true,
            "visibilityPriority": 100
          },
          "vaccineSequence": {
            "type": "String",
            "list": "vaccineFrequency",
            "fullName": "Vaccine Sequence",
            "description": "Number of the vaccine sequence.",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visible": true,
            "visibilityPriority": 100
          },
          "_id": {
            "type": "ObjectID",
            "visible": false,
            "generated": true,
            "fullName": "Subschema element id",
            "description": "Subschema element id",
            "generatorSpecification": [
              "_id()"
            ]
          }
        },
        "limitReturnedRecords": 0,
        "requiresAuthentication": true
      },
      "sideEffects": {
        "type": "Subschema",
        "fullName": "My Side Effects",
        "requiresAuthentication": true,
        "defaultSortBy": {
          "dateSideEffect": -1
        },
        "fields": {
          "dateSideEffect": {
            "type": "Date",
            "fullName": "Date of side effect",
            "visibilityPriority": 1,
            "required": true,
            "description": "Date on which side effect occurred.",
            "validate": [
              {
                "validator": "notInFuture",
                "arguments": {},
                "errorMessages": {
                  "default": "This date cannot be in the future"
                }
              }
            ],
            "width": 85,
            "visible": true
          },
          "sideEffect": {
            "type": "String[]",
            "fullName": "Side Effect(s) Experienced",
            "visibilityPriority": 2,
            "list": "sideEffects",
            "required": true,
            "description": "Pick one or more side effects that occurred.",
            "visible": true,
            "width": 100
          },
          "duration": {
            "type": "Number",
            "fullName": "Duration of side effect",
            "visibilityPriority": 3,
            "required": true,
            "description": "Duration of the side effect(s) in minutes.",
            "width": 30,
            "visible": true
          },
          "comments": {
            "type": "String",
            "fullName": "Side Effect Comments",
            "validate": [
              {
                "validator": "maxLength",
                "arguments": {
                  "length": "500"
                },
                "errorMessages": {
                  "default": "Value is too long, should be at most $length characters long"
                }
              }
            ],
            "visibilityPriority": 4,
            "description": "Comments about the side effects.",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visible": true
          },
          "_id": {
            "type": "ObjectID",
            "visible": false,
            "generated": true,
            "fullName": "Subschema element id",
            "description": "Subschema element id",
            "generatorSpecification": [
              "_id()"
            ]
          }
        },
        "limitReturnedRecords": 0
      },
      "notes": {
        "type": "String",
        "subtype": "Text",
        "list": "citizenConditions",
        "fullName": "Conditions",
        "visible": false,
        "description": "Random free-form notes about self.",
        "width": 150,
        "searchable": true,
        "transform": [
          "trim"
        ],
        "visibilityPriority": 100
      },
      "generatorBatchNumber": {
        "type": "String",
        "visible": false,
        "generated": true,
        "fullName": "Generator Batch Number",
        "description": "Set to the ID of generator batch for synthetic records"
      }
    },
    "type": "Schema",
    "fullName": "Clinical Health Information",
    "requiresAuthentication": true,
    "limitReturnedRecords": 1,
    "singleRecord": true,
    "defaultSortBy": {
      "_id": -1
    }
  },
  "users": {
    "type": "Schema",
    "fullName": "User Data",
    "singleRecord": true,
    "limitReturnedRecords": 1,
    "requiresAuthentication": true,
    "controller": "user",
    "schemaTransform": [
      "user"
    ],
    "description": "This collection solely serves the purpose of user authentication. Besides password recovery email there should be no PII in this collection.",
    "fields": {
      "phiId": {
        "type": "String",
        "unique": true,
        "visible": false,
        "fullName": "Citizen PII ID",
        "generated": true,
        "description": "The system generated unique identifier to store and retrieve the patient's PII information.",
        "width": 150,
        "searchable": true,
        "transform": [
          "trim"
        ],
        "visibilityPriority": 100
      },
      "piiId": {
        "type": "String",
        "unique": true,
        "visible": false,
        "fullName": "Citizen PII ID",
        "generated": true,
        "description": "The system generated unique identifier to store and retrieve the patient's PII information.",
        "width": 150,
        "searchable": true,
        "transform": [
          "trim"
        ],
        "visibilityPriority": 100
      },
      "login": {
        "type": "String",
        "unique": true,
        "required": true,
        "visible": false,
        "fullName": "Login",
        "description": "Unique use login. Could be email or anything else.",
        "validate": [
          {
            "validator": "minLength",
            "arguments": {
              "length": "5"
            },
            "errorMessages": {
              "default": "Value is too short, should be at least $length characters long"
            }
          },
          {
            "validator": "maxLength",
            "arguments": {
              "length": "30"
            },
            "errorMessages": {
              "default": "Value is too long, should be at most $length characters long"
            }
          }
        ],
        "width": 150,
        "searchable": true,
        "transform": [
          "trim"
        ],
        "visibilityPriority": 100
      },
      "email": {
        "type": "String",
        "default": "",
        "required": true,
        "subtype": "Email",
        "fullName": "Email",
        "description": "This email is used for the password recovery purposes only",
        "width": 150,
        "searchable": true,
        "transform": [
          "trim"
        ],
        "validate": [
          {
            "validator": "regex",
            "arguments": {
              "regex": "^[a-zA-Z0-9.!#$%&’*+\\/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\\.[a-zA-Z0-9-]+)*$",
              "regexOptions": "i"
            },
            "errorMessages": {
              "default": "Please enter correct email"
            }
          }
        ],
        "visible": true,
        "visibilityPriority": 100
      },
      "password": {
        "type": "String",
        "default": "",
        "required": true,
        "subtype": "Password",
        "fullName": "Password",
        "description": "The password that the citizen has selected to use with the HealthyCitizen application.",
        "width": 150,
        "searchable": true,
        "transform": [
          "trim"
        ],
        "validate": [
          {
            "validator": "min",
            "arguments": {
              "limit": "8"
            },
            "errorMessages": {
              "default": "Value $val is too small, should be greater than @limit",
              "date": "Date $val should be after @limit (#limit)"
            }
          },
          {
            "validator": "regex",
            "arguments": {
              "regex": "((?=.*\\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%!&^*-_]).{8})",
              "regexOptions": "i"
            },
            "errorMessages": {
              "default": "Password must contain at least one of each: digit 0-9, lowercase character, uppercase character and one special character: @#$%!&^*-_ and be at least 8 characters long"
            }
          }
        ],
        "visible": true,
        "visibilityPriority": 100
      },
      "salt": {
        "type": "String",
        "visible": false,
        "generated": true,
        "fullName": "Salt",
        "description": "Password hash function salt",
        "width": 150,
        "searchable": true,
        "transform": [
          "trim"
        ],
        "visibilityPriority": 100
      },
      "accountProvider": {
        "type": "Array",
        "fullName": "linkedAccounts",
        "description": "Social network account providing authentication for this user. Additional social networks can be recorded in PII data",
        "fields": {
          "name": {
            "type": "String",
            "generated": true,
            "fullName": "Provider",
            "description": "Account provider (such as facebook, twitter etc)",
            "width": 150,
            "searchable": true,
            "transform": [
              "trim"
            ],
            "visible": true,
            "visibilityPriority": 100
          },
          "data": {
            "type": "Mixed",
            "visible": false,
            "fullName": "Provider Data",
            "description": "Account provider-specific data",
            "visibilityPriority": 100,
            "width": 100
          }
        },
        "visible": true,
        "visibilityPriority": 100,
        "width": 100
      },
      "updated": {
        "type": "Date",
        "visible": false,
        "generated": true,
        "fullName": "Updated",
        "description": "The system generated date when the citizen user account was updated.",
        "width": 85,
        "visibilityPriority": 100
      },
      "created": {
        "type": "Date",
        "visible": false,
        "defaultF": "dateNow",
        "generated": true,
        "fullName": "Created",
        "description": "The system generated date when the citizen user account was created.",
        "width": 85,
        "visibilityPriority": 100
      },
      "resetPasswordToken": {
        "type": "String",
        "visible": false,
        "generated": true,
        "fullName": "Reset Password Token",
        "description": "The system assigned token that is sent to the citizen when they request a password reset.",
        "width": 150,
        "searchable": true,
        "transform": [
          "trim"
        ],
        "visibilityPriority": 100
      },
      "resetPasswordExpires": {
        "type": "Date",
        "visible": false,
        "generated": true,
        "fullName": "Reset Password Expires",
        "description": "The date the password token will expire.",
        "width": 85,
        "visibilityPriority": 100
      },
      "generatorBatchNumber": {
        "type": "String",
        "visible": false,
        "generated": true,
        "fullName": "Generator Batch Number",
        "description": "Set to the ID of generator batch for synthetic records"
      }
    },
    "defaultSortBy": {
      "_id": -1
    }
  },
  "dataPulls": {
    "type": "Schema",
    "fullName": "Data Pulls",
    "limitReturnedRecords": 100,
    "requiresAuthentication": true,
    "description": "This collection contains the list of the data pulls",
    "fields": {
      "component": {
        "type": "String",
        "visibilityPriority": 2,
        "fullName": "Component",
        "description": "Name of the component being pulled",
        "width": 150,
        "searchable": true,
        "transform": [
          "trim"
        ],
        "visible": true
      },
      "rangeStart": {
        "type": "Date",
        "fullName": "Range Start",
        "description": "The start of the range of the data being pulled. Typically the start of the date range for which the data is being retrieved",
        "width": 85,
        "visible": true,
        "visibilityPriority": 100
      },
      "rangeEnd": {
        "type": "Date",
        "fullName": "Range End",
        "description": "The end of the range of the data being pulled. Typically the end of the date range for which the data is being retrieved",
        "width": 85,
        "visible": true,
        "visibilityPriority": 100
      },
      "currentPoint": {
        "type": "Date",
        "fullName": "Current Point",
        "description": "Where in the pull range (i.e. in rangeStart-rangeEnd range) the data pull process currently is",
        "width": 85,
        "visible": true,
        "visibilityPriority": 100
      },
      "pullStartDate": {
        "type": "Date",
        "visibilityPriority": 1,
        "fullName": "Pull Start Date",
        "description": "When the data pull started",
        "width": 85,
        "visible": true
      },
      "pullEndDate": {
        "type": "Date",
        "fullName": "Pull End Date",
        "description": "When the data pull ended",
        "width": 85,
        "visible": true,
        "visibilityPriority": 100
      },
      "numberOfCalls": {
        "type": "Number",
        "fullName": "Number of Calls",
        "description": "Number of calls done in this data pull (for statistical purposes)",
        "width": 30,
        "visible": true,
        "visibilityPriority": 100
      },
      "state": {
        "type": "String",
        "fullName": "State",
        "description": "The current state of the data pull process",
        "list": "dataPullStates",
        "width": 150,
        "searchable": true,
        "transform": [
          "trim"
        ],
        "visible": true,
        "visibilityPriority": 100
      },
      "statusMessage": {
        "type": "String",
        "fullName": "Status Message",
        "description": "Data Pull final status message. For instance error message if pull failed",
        "width": 150,
        "searchable": true,
        "transform": [
          "trim"
        ],
        "visible": true,
        "visibilityPriority": 100
      },
      "generatorBatchNumber": {
        "type": "String",
        "visible": false,
        "generated": true,
        "fullName": "Generator Batch Number",
        "description": "Set to the ID of generator batch for synthetic records"
      }
    },
    "defaultSortBy": {
      "_id": -1
    }
  }
};