const buckets=new Map<string,{count:number;reset:number}>();
export function rateLimit(key:string,limit:number,windowMs:number){const now=Date.now();let bucket=buckets.get(key);if(!bucket||bucket.reset<=now){bucket={count:0,reset:now+windowMs};buckets.set(key,bucket)}bucket.count++;return{ok:bucket.count<=limit,retryAfter:Math.max(1,Math.ceil((bucket.reset-now)/1000))}}
