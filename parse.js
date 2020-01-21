let fs = require ('fs');
const glob = require ('glob');

const reMatch = new RegExp (/<device\s.*?name="(.+?)".+?<\/device>.+?<module\scaption=".*?"\sname="FUSE">\s(.+?)\s<\/module>/s);
const reFuseRegister = new RegExp (/<register\s.*?name="(.+?)".+?initval="(.+?)">\s(.+?)<\/register>/gs);
const reValueGroup = new RegExp (/<value-group\s.+?>\s(.+?)\s<\/value-group>/gs);

function convertFile (fileName) {
  function parseSingleValue (valueString) {
    const name = valueString.match (/<value\s.*?name="(.+?)".*?\/>/)[1];
    const caption = valueString.match (/<value\s.*?caption="(.+?)".*?\/>/)[1];
    const value = valueString.match (/<value\s.*?value="(.+?)".*?\/>/)[1];
    return {
      name,
      caption,
      value
    }
  }

  function parseValueGroup (valueGroup) {
    const values = valueGroup.match (/<value\s.*?\/>/g)
      .map (parseSingleValue);
    const name = valueGroup.match (/<value-group\s.*?name="(.*?)"/)[1];
    return {
      name,
      values
    };
  }

  function parseValues (values) {
    return valueGroups.find((el) => el.name === values);
  }

  function parseBitField (bitField) {
    const name = bitField.match (/<bitfield\s.*?name="(.+?)".*?\/>/)[1];
    const caption = bitField.match (/<bitfield\s.*?caption="(.+?)".*?\/>/)[1];
    const mask = bitField.match (/<bitfield\s.*?mask="(.+?)".*?\/>/)[1];
    const valueParse = bitField.match (/<bitfield\s.*?values="(.+?)".*?\/>/);
    const valueLabel = valueParse && valueParse[1];
    const valuesArray = valueLabel && parseValues (valueLabel);
    return {
      name,
      caption,
      mask,
      ...(valueLabel) ? {
        valueLabel,
        valuesArray
      } : {}
    }
  }

  function parseFuseReg (register) {
    const name = register.match (/<register\s.*?name="(.+?)"/)[1];
    const initval = register.match (/<register\s.*?initval="(.+?)"/)[1];
    const bitFields = register.match (/<bitfield\s.+?\/>/g)
      .map (parseBitField);
    return {
      name,
      initval,
      bitFields
    }
  }

  const data = fs.readFileSync (`atdf/${fileName}.atdf`, 'utf-8');
  const matchArray = data.match (reMatch);
  const name = matchArray[1];
  const fuses = matchArray[2];
  let valueGroups = (fuses.match (reValueGroup) || [])
    .map (parseValueGroup)
  const fuseRegs = fuses.match (reFuseRegister)
    .map (parseFuseReg);

  return {
    name,
    fuses: fuseRegs
  };
}

function getFileName(file) {
  const fileNameArr = file.split('/');
  const fileNameExt = fileNameArr[fileNameArr.length - 1];
  const fileName = fileNameExt.split('.')[0];
  return fileName;
}

glob ('./atdf/*.atdf', {} , function (er, files) {
  if (files) {
    const jsonArr = files.map((file) => {
      console.log ('Parsing:', getFileName (file));
      return convertFile (getFileName (file));
    });
    fs.writeFileSync ('./list.json', JSON.stringify (files.map (getFileName), null, 2));
    fs.writeFileSync ('./data.json', JSON.stringify (jsonArr, null, 2));
  }
});

// console.log (convertFile ('Attiny10'));