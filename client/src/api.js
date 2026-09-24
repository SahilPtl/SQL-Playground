export async function api(path,body) {
  let response;
  try {response=await fetch('/api'+path,{credentials:'include',headers:body?{'Content-Type':'application/json'}:{},method:body?'POST':'GET',body:body?JSON.stringify(body):undefined});}
  catch{throw new Error('Unable to connect to SQL Playground server. Check the demo terminal.');}
  const data=await response.json();
  if(!response.ok)throw new Error(data.error || 'Request failed.');
  return data;
}
