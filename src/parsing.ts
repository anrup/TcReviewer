import * as xml2js from 'xml2js';
import * as fs from 'fs';

// Read the XML file
export function parseFile(fileName : string) : Promise<any> {
    return new Promise((resolve, reject) => {
        fs.readFile(fileName, 'utf-8', (err, data) => {
            if (err) {
                reject(err);
            }

            // Parse the XML data
            xml2js.parseString(data, (err : any, result : any) => {
                if (err) {
                    reject(err);
                }

                resolve(result.TcPlcObject.POU[0]);

                // Process the parsed XML result
                //console.log(JSON.stringify(result, null, 2));

            });
        });
    });
};

// Example use
// let pouData = parseFile('C:\\Users\\Gigabyte\\Documents\\TcExampleProj\\ExampleProject\\ExampleProject\\ExamplePlcProj\\POUs\\FB_Example.TcPOU');
// pouData
//     .then((data) => {
//         //const pouDeclarations = pou.$.Declaration;
//         //const pouImplmenetation = pou.$.Implementation;

//         const methods = data.Method.map((obj : any) => obj.$.Name);
//         const properties = data.Property.map((obj : any) => obj.$.Name);

//         console.log(methods);
//         console.log(properties);
//     })
//     .catch((error) => {
//         console.log(error);
//     });


