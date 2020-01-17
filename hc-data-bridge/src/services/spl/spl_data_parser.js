const Promise = require('bluebird');
const fs = require('fs-extra');
const path = require('path');
const _ = require('lodash');
const $ = require('cheerio');

const { getNormalizedNDCByPackageNDC, getProductCodeByProductCodeWithDash } = require('../util/ndc');
const { getDate } = require('../util/date');

const NDC_OID = '2.16.840.1.113883.6.69';

class SplDataParser {
  constructor(xmlFilePath, uploadFolder, relativePath) {
    this.xmlFilePath = xmlFilePath;
    this.xmlDirPath = path.dirname(xmlFilePath);
    this.uploadFolder = uploadFolder;
    this.relativePath = relativePath;

    this.splId = null;
    this.splSetId = null;
    this.version = null;
    this.effectiveTime = null;
  }

  async getData() {
    const { xmlFilePath } = this;
    try {
      const xmlString = await fs.readFile(xmlFilePath, 'utf-8');
      const xmlObj = $.load(xmlString, {
        normalizeWhitespace: true,
        xmlMode: true,
      });

      this.splId = xmlObj('document > id')[0].attribs.root;
      this.splSetId = xmlObj('document > setId')[0].attribs.root;
      this.version = +xmlObj('document > versionNumber')[0].attribs.value;
      this.effectiveTime = getDate(xmlObj('document > effectiveTime')[0].attribs.value);

      const allSectionsMediaReferences = this._getObjMediaReferences(xmlObj);
      await this._moveReferencedPictures(allSectionsMediaReferences);

      // "SPL location: The product data elements are in the first section of the SPL Body."
      const sections = xmlObj('document > component > structuredBody > component > section').toArray();

      const productSectionIndex = sections.findIndex(s => {
        const codeTag = getChildrenByTagName(s, 'code')[0];
        const { code, codeSystem } = _.get(codeTag, 'attribs', {});
        return code === '48780-1' && codeSystem === '2.16.840.1.113883.6.1';
      });
      let productSection;
      if (productSectionIndex !== -1) {
        productSection = sections.splice(productSectionIndex, 1)[0];
      } else {
        console.warn(`Unable to find product section by code condition. First section will be processed`);
        productSection = sections.shift();
      }
      const { products } = this._getProductSectionData(productSection);

      const sectionsData = await Promise.map(sections, section =>
        this._getSectionData(section, allSectionsMediaReferences)
      ).filter(s => s);
      return {
        splId: this.splId,
        splSetId: this.splSetId,
        version: this.version,
        effectiveTime: this.effectiveTime,
        products,
        sections: sectionsData,
      };
    } catch (e) {
      console.error(`Unable to get sections data by path ${xmlFilePath}`);
      throw e;
    }
  }

  async _getSectionData(section, allSectionsMediaReferences) {
    const codeTag = getChildrenByTagName(section, 'code')[0];
    if (!codeTag) {
      console.warn(`Found a section without 'code' tag. It will not be included in sections list.`);
      return;
    }
    const { code, codeSystem, displayName } = codeTag.attribs;

    const titleTag = getChildrenByTagName(section, 'title')[0];
    const displayNameTitle = _.unescape(_.replace(displayName, / section/i, '')).trim();
    const title = _.get(titleTag, 'children.0.data', displayNameTitle);
    const sectionId = getChildrenByTagName(section, 'id')[0].attribs.root;
    const effectiveTimeTag = getChildrenByTagName(section, 'effectiveTime')[0];
    const effectiveTime = getDate(_.get(effectiveTimeTag, 'attribs.value'));

    let html = '';
    // html += `<a href="#" class="closed open">${title}</a>`;
    _.each(getChildrenByTagName(section, 'component'), component => {
      const compHtml = this._parseComponentHtml(component, allSectionsMediaReferences);
      html += compHtml;
    });

    let text = '';
    _.each(getChildrenByTagName(section, 'text'), textTag => {
      text += $(textTag).html();
      html += this._parseText(textTag, allSectionsMediaReferences);
    });

    const loadedSection = $.load(section, { xmlMode: true });
    const sectionMediaReferenceUsages = this._getObjMediaReferenceUsages(loadedSection, allSectionsMediaReferences);

    return {
      title,
      code,
      codeSystem,
      id: sectionId,
      effectiveTime,
      text,
      html,
      images: sectionMediaReferenceUsages,
    };
  }

  _moveReferencedPictures(mediaReferences) {
    // some pics are used many times in different sections, move it only once
    const referencedPictures = _.uniq(_.map(mediaReferences, refInfo => refInfo.reference));
    return Promise.map(referencedPictures, async picName => {
      const picPath = path.resolve(this.xmlDirPath, picName);
      try {
        await this._movePictureToFolder(picPath, picName);
      } catch (e) {
        console.error(`Unable to move picture ${picPath}`, e.stack);
      }
    });
  }

  async _movePictureToFolder(filePath, pictureName) {
    const destinationPath = path.join(this.uploadFolder, this.relativePath, `${this.splSetId}/${pictureName}`);
    if (await fs.pathExists(destinationPath)) {
      // overwrite: true doesn't work for not existing paths
      return fs.move(filePath, destinationPath, { overwrite: true });
    }
    return fs.move(filePath, destinationPath);
  }

  /** obj should be retrieved with cheerio.load */
  _getObjMediaReferences(obj) {
    const media = {};
    _.each(obj('observationMedia'), observationMedia => {
      const mediaId = observationMedia.attribs.ID;
      const altNameForImg = $(observationMedia)
        .find('text')
        .html();
      const { mediaType } = $(observationMedia).find('value')[0].attribs;
      const pictureName = $(observationMedia).find('reference')[0].attribs.value;
      media[mediaId] = {
        id: mediaId,
        mediaType,
        reference: pictureName,
        text: altNameForImg,
      };
    });
    return media;
  }

  /** obj should be retrieved with cheerio.load */
  _getObjMediaReferenceUsages(obj, allSectionsMediaReferences) {
    const media = new Set();
    _.each(obj('renderMultiMedia'), renderMultiMedia => {
      const mediaId = renderMultiMedia.attribs.referencedObject;
      const meta = _.find(allSectionsMediaReferences, (el, id) => id === mediaId);
      media.add(meta);
    });
    return [...media];
  }

  _getProductSectionData(section) {
    const xmlSection = $.load(section, { xmlMode: true });
    let isNewFormat = true;
    let products = $(xmlSection(`subject > manufacturedProduct > manufacturedProduct`));
    if (!products.length) {
      isNewFormat = false;
      products = $(xmlSection(`subject > manufacturedProduct > manufacturedMedicine`));
    }
    const containerTagName = isNewFormat ? 'containerPackagedProduct' : 'containerPackagedMedicine';

    if (!products.length) {
      console.warn(`Unable to find products splSetId: '${this.splSetId}', file: '${this.xmlFilePath}'`);
    }

    const productsData = [];
    products.each((i, drug) => {
      const productLoad = $.load(drug, { xmlMode: true });
      const ingredients = productLoad('ingredient ingredientSubstance > name')
        .toArray()
        .map(e => _.get(e, 'children[0].data'))
        .map(ingredient => ({ ingredient }));
      const proprietaryProductName = productLoad(':root > name').text();
      const nonProprietaryProductName = productLoad('asEntityWithGeneric > genericMedicine > name').text();

      const packageNdc11s = productLoad(`${containerTagName} > code`)
        .toArray()
        .map(c => {
          const { codeSystem, code } = c.attribs;
          if (!codeSystem && code) {
            console.warn(
              `Found ${containerTagName} without 'codeSystem' tag. Trying to parse code='${code}' as NDC code.`
            );
            return getNormalizedNDCByPackageNDC(code);
          }
          if (codeSystem === NDC_OID) {
            return getNormalizedNDCByPackageNDC(code);
          }
          return undefined;
        })
        .filter(c => c)
        .map(packageNdc11 => ({ packageNdc11 }));
      if (!packageNdc11s.length) {
        console.warn(
          `Unable to find normalized packageNdc11s for splSetId: '${this.splSetId}', file: '${this.xmlFilePath}'`
        );
      }
      const productCodeWithDashes = getChildrenByTagName(drug, 'code')[0].attribs.code;
      const productNdc11 = getProductCodeByProductCodeWithDash(productCodeWithDashes);
      const productType = getChildrenByTagName(drug, 'asEntityWithGeneric').length ? 'drugs' : 'devices';

      productsData.push({
        name: proprietaryProductName,
        isKit: productLoad('formCode')[0].attribs.code === 'C47916',
        productNdc11,
        packageNdc11s,
        genericName: nonProprietaryProductName,
        ingredients,
        productType,
      });
    });
    return { products: productsData };
  }

  _parseText(text, allSectionsMediaReferences) {
    let html = '';
    _.each(text.children, ch => {
      const { type, name } = ch;
      const isTag = type === 'tag';
      if (isTag && name === 'paragraph') {
        html += this._parseParagraph(ch, allSectionsMediaReferences);
      } else if (isTag && name === 'table') {
        html += this._parseTable(ch);
      } else if (isTag && name === 'list') {
        html += this._parseList(ch);
      } else if (type === 'text') {
        html += ch.data;
      } else if (isTag && name === 'renderMultiMedia') {
        html += this._parseRenderMultiMedia(ch, allSectionsMediaReferences);
      } else {
        html += $.html(ch);
      }
    });
    return html;
  }

  _parseParagraph(paragraph, allSectionsMediaReferences) {
    let html = '';
    _.each(paragraph.children, ch => {
      const { type, name } = ch;
      const isTag = type === 'tag';
      if (isTag && name === 'content') {
        html += this._parseContent(ch);
      } else if (isTag && name === 'renderMultiMedia') {
        html += this._parseRenderMultiMedia(ch, allSectionsMediaReferences);
      } else if (type === 'text') {
        html += ch.data;
      } else {
        html += $.html(ch);
      }
    });
    return `<p>${html}</p>`;
  }

  _parseContent(content) {
    let html = '';
    _.each(content.children, ch => {
      const { type, name } = ch;
      if (type === 'tag' && name === 'content') {
        html += this._parseContent(ch);
      } else if (type === 'text') {
        html += ch.data;
      } else {
        html += $.html(ch);
      }
    });
    // bold, italics, underline transform to Bold, Italics, Underline
    const styleCodeClass = _.upperFirst(content.attribs.styleCode);
    return `<span class="${styleCodeClass}">${html}</span>`;
  }

  _parseTable(table) {
    // TODO: parse tfoot. Example: "<content styleCode="bold"> </content>Equivalent Doses (mcg)<footnote ID="FOOT_21225">For example, 125 mcg Digoxin Tablets equivalent to 125 mcg Digoxin Elixir Pediatric equivalent to 100 mcg Digoxin Solution in Capsules equivalent to 100 mcg Digoxin Injection/IV.</footnote>"
    return $.html(table);
  }

  _parseList(list) {
    let html = '';
    _.each(list.children, ch => {
      const { type, name } = ch;
      if (type === 'tag' && name === 'item') {
        let data = _.get(ch, 'children.0.data');
        data = _.isString(data) && data.trim() !== '' ? data : $(ch).text();
        html += `<li>${data}</li>`;
      } else if (type === 'text') {
        html += ch.data;
      } else {
        html += $.html(ch);
      }
    });
    // bold, italics, underline transform to Bold, Italics, Underline
    const styleCodeClass = _.upperFirst(list.attribs.styleCode);
    const listElem = list.attribs.listType === 'ordered' ? 'ol' : 'ul';
    return `<${listElem} class="${styleCodeClass}">${html}</${listElem}>`;
  }

  _parseRenderMultiMedia(renderMultiMedia, allSectionsMediaReferences) {
    const mediaId = renderMultiMedia.attribs.referencedObject;
    const meta = _.find(allSectionsMediaReferences, (obj, id) => id === mediaId);
    if (!meta) {
      console.warn(
        `Unable to find imageMeta by referenceObject: ${renderMultiMedia.attribs.referencedObject} for splSetId ${
          this.splSetId
        }. Seems like image is declared in other section`
      );
      return '';
    }
    return this._getHtmlForMedia(meta.text, meta.reference);
  }

  _getHtmlForMedia(altNameForImg, pictureName) {
    const src = `${this.relativePath}/${this.splSetId}/${pictureName}`;
    return `<div class="Figure" name="${pictureName}">
   <img src="${src}" alt="${altNameForImg}">
  </div>`;
  }

  _parseComponentHtml(component, allSectionsMediaReferences) {
    let html = '';
    _.each(getChildrenByTagName(component, 'text'), text => {
      html += this._parseText(text, allSectionsMediaReferences);
    });
    return html;
  }

  _parseComponentMediaReferences(component) {
    const media = {};
    _.each(getChildrenByTagName(component, 'observationMedia'), observationMedia => {
      const mediaId = observationMedia.attribs.ID;
      const altNameForImg = $(observationMedia)
        .find('text')
        .html();
      const { mediaType } = $(observationMedia).find('value')[0].attribs;
      const pictureName = $(observationMedia).find('reference')[0].attribs.value;
      media[mediaId] = {
        id: mediaId,
        mediaType,
        reference: pictureName,
        text: altNameForImg,
      };
    });
    return media;
  }
}

function getChildrenByTagName(elem, tagName) {
  return elem.children ? elem.children.filter(c => c.type === 'tag' && c.name === tagName) : [];
}

function removeDashes(str) {
  return str.replace(/-/g, '');
}

module.exports = SplDataParser;
