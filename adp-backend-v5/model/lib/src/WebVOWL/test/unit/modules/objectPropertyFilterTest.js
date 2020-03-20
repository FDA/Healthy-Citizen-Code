const OwlClass = require("../../../src/webvowl/js/elements/nodes/implementations/OwlClass");
const OwlThing = require("../../../src/webvowl/js/elements/nodes/implementations/OwlThing");
const ObjectProperty = require(
	"../../../src/webvowl/js/elements/properties/implementations/OwlObjectProperty");
const DatatypeProperty = require(
	"../../../src/webvowl/js/elements/properties/implementations/OwlDatatypeProperty");
const Link = require("../../../src/webvowl/js/elements/links/PlainLink");

describe("Filtering of object properties", function () {
	let filter;

	beforeEach(function () {
		jasmine.addMatchers({
			                    toBeInstanceOf () {
				                    return {
					                    compare (actual, expected) {
						                    return {
							                    pass: actual instanceof expected,
						                    };
					                    },
				                    };
			                    },
		                    });
	});

	beforeEach(function () {
		filter = require("../../../src/webvowl/js/modules/objectPropertyFilter")();
		filter.enabled(true);
	});

	it("should remove object properties", function () {
		const domain = new OwlClass();
		const range = new OwlClass();
		const objectProperty = new ObjectProperty();

		objectProperty.domain(domain).range(range);

		filter.filter([domain, range], [objectProperty]);

		expect(filter.filteredNodes()).toEqual([domain, range]);
		expect(filter.filteredProperties().length).toBe(0);
	});

	it("should remove things without any other properties", function () {
		const domain = new OwlThing();
		const range = new OwlThing();
		const objectProperty = new ObjectProperty();

		objectProperty.domain(domain).range(range);
		const objectPropertyLink = new Link(domain, range, objectProperty);
		domain.links([objectPropertyLink]);
		range.links([objectPropertyLink]);

		filter.filter([domain, range], [objectProperty]);

		expect(filter.filteredNodes().length).toBe(0);
		expect(filter.filteredProperties().length).toBe(0);
	});

	it("should keep things with any other properties", function () {
		const domain = new OwlClass();
		const range = new OwlThing();
		const objectProperty = new ObjectProperty();
		const datatypeProperty = new DatatypeProperty();

		objectProperty.domain(domain).range(range);
		datatypeProperty.domain(domain).range(range);
		const objectPropertyLink = new Link(domain, range, objectProperty);
		const datatypePropertyLink = new Link(domain, range, datatypeProperty);
		domain.links([objectPropertyLink, datatypePropertyLink]);
		range.links([objectPropertyLink, datatypePropertyLink]);

		filter.filter([domain, range], [objectProperty, datatypeProperty]);

		expect(filter.filteredNodes()).toEqual([domain, range]);
		expect(filter.filteredProperties()).toEqual([datatypeProperty]);
	});
});
