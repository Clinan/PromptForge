import parseCurl from 'parse-curl';

const cmd = `curl --location 'https://ark.cn-beijing.volces.com/api/v1/chat/completions' --header 'Content-Type: application/json' --header 'Authorization: Bearer 1232462421' --data '{"model": "doubao","messages": [{"role": "user","content": "Hello!"}]}'`;

const result = parseCurl(cmd);
console.log(JSON.stringify(result, null, 2));
