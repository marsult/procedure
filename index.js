function generateProcedure(scheme, tableName, procedureName, parameters, additional) {
    let procedureString = `CREATE OR REPLACE PROCEDURE ${scheme}.${procedureName} (\n`;

    const paramList = parameters.map(param => {
        return `IN ${param.name} ${param.type}`;
    });

    const maxLineLength = 150;
    let currentLine = '';
    const formattedParamList = [];

    paramList.forEach(param => {
        if ((currentLine + param).length > maxLineLength) {
            formattedParamList.push(`\t${currentLine.trim()}`);
            currentLine = param + ', ';
        } else {
            currentLine += param + ', ';
        }
    });

    if (currentLine) {
        formattedParamList.push(`\t${currentLine.slice(0, -2).trim()}`);
    }

    procedureString += formattedParamList.join('\n') + '\n)\nBEGINing\n';
    procedureString += `\tDECLARE SQL_STMT CLOB;\n\n`; // Menggunakan tab di sini

    procedureString += `\tSET SQL_STMT = 'MERGE INTO ${scheme}.${tableName} AS T USING (VALUES (\n`;

    parameters.forEach((param, index) => {
        if (param.nullable) {
            procedureString += `\t\t\tCASE WHEN ${param.name} IS NULL THEN 'NULL' ELSE '''' || ${param.name} || '''' END || ', ' ||\n`;
        } else {
            procedureString += `\t\t\t''' || ${param.name} || ''' , ' ||\n`;
        }
    });

    procedureString = procedureString.slice(0, -3) + ')) ';
    procedureString = procedureString.replace(/\|\| ', ' \)\)/g, "|| \n\t\t'))");
    procedureString += `AS S (${parameters.map(p => p.name).join(', ')}) ON (T.${parameters[0].name} = S.${parameters[0].name}) ' ||\n`;
    procedureString += `\t\t'WHEN MATCHED THEN ' ||\n`;
    procedureString += `\t\t\t'UPDATE SET ${parameters.map(p => `T.${p.name} = S.${p.name}`).join(', ')}${(additional.length!=0)?', ':''}${additional.map(a=>`T.${a.name} = S.${a.name}`).join(', ')} ' ||\n`;
    procedureString += `\t\t'WHEN NOT MATCHED THEN ' ||\n`;
    procedureString += `\t\t\t'INSERT (${parameters.map(p => p.name).join(', ')}${(additional.length!=0)?', ':''}${additional.map(a=>`${a.name}`).join(', ')}) VALUES (${parameters.map(p => `S.${p.name}`).join(', ')}${(additional.length!=0)?', ':''}${additional.map(a=>`${a.value}`).join(', ')})';\n\n`;

    procedureString += `\tPREPARE STMT FROM SQL_STMT;\n`;
    procedureString += `\tEXECUTE STMT;\n`;
    procedureString += `END\n@`;

    return procedureString;
}


const scheme = 'MWCONFIG'
const tableName = 'MAPPING';
const procedureName = 'MERGE_MAPPING';
const parameters = [
  { name: 'ID', type: 'VARCHAR(256)', nullable: false },
  { name: 'MODULE', type: 'CLOB', nullable: true },
  { name: 'DESCRIPTION', type: 'CLOB', nullable: true },
];

const additional = [
//   { name: 'MODIFIED_BY', value: 'CURRENT USER' },
//   { name: 'TIMESTAMP', value: 'CURRENT TIMESTAMP' },
];

const sqlProcedure = generateProcedure(scheme, tableName, procedureName, parameters, additional);
const outputTextarea = document.getElementById('output');

function adjustHeight() {
  const style = window.getComputedStyle(this);
  const paddingTop = parseInt(style.paddingTop) || 0;
  const paddingBottom = parseInt(style.paddingBottom) || 0;

  this.style.height = 'auto';
  this.style.height = `${this.scrollHeight + paddingTop + paddingBottom}px`;
}

function updateLineNumbers() {
  const lines = this.value.split('\n').length;
  const lineNumbers = document.getElementById('line-numbers');
  lineNumbers.innerHTML = '';

  for (let i = 1; i <= lines; i++) {
    const line = document.createElement('span');
    line.textContent = i;
    lineNumbers.appendChild(line);
  }
}

function copyToClipboard() {
  const outputTextarea = document.getElementById('output');
  outputTextarea.select();
  document.execCommand('copy');
}

document.addEventListener('DOMContentLoaded', () => {
  
  outputTextarea.value = sqlProcedure;
  adjustHeight.call(outputTextarea);
  updateLineNumbers.call(outputTextarea);
  
  outputTextarea.addEventListener('input', () => {
    adjustHeight.call(outputTextarea);
    updateLineNumbers.call(outputTextarea);
  });

  const copyButton = document.getElementById('copy-btn');
  copyButton.addEventListener('click', copyToClipboard);
});

outputTextarea.addEventListener('wheel', function (e) {
  if (e.deltaY !== 0 && e.shiftKey) {
    this.scrollLeft += e.deltaY;
    e.preventDefault();
  }
});

