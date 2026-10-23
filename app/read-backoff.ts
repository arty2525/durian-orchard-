// Used only by read requests. Never retries irrigation commands.
export class ReadBackoff {
 private failures=0;
 private until=0;
 ready(now=Date.now()){return now>=this.until}
 success(){this.failures=0;this.until=0}
 fail(retryAfter:string|null=null,now=Date.now()){
  this.failures=Math.min(this.failures+1,6);
  const seconds=retryAfter===null?NaN:Number(retryAfter);
  const retryMs=Number.isFinite(seconds)?Math.max(0,seconds*1000):retryAfter?Math.max(0,Date.parse(retryAfter)-now):0;
  const delay=Math.max(Math.min(300000,15000*2**(this.failures-1)),Number.isFinite(retryMs)?retryMs:0);
  this.until=now+delay;
  return delay;
 }
}
