import {mkdtemp,readFile,readdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
function python(payload){return new Promise((resolve,reject)=>{
 const child=spawn('python3',['-c',`import sqlite3,json,sys
p=json.load(sys.stdin)
c=sqlite3.connect(p['file'],timeout=10)
c.row_factory=sqlite3.Row
if 'schema' in p:c.executescript(p['schema']);c.commit();print('{}')
else:
 statements=p.get('statements',[{'sql':p.get('sql'),'args':p.get('args',[])}])
 c.execute('BEGIN')
 out=[]
 for s in statements:
  cur=c.execute(s['sql'],s['args'])
  rows=[dict(r) for r in cur.fetchall()]
  changes=c.execute('SELECT changes()').fetchone()[0]
  out.append({'results':rows,'meta':{'changes':changes}})
 c.commit()
 print(json.dumps(out if 'statements' in p else out[0]))`]);
 let out='',err='';child.stdout.on('data',b=>out+=b);child.stderr.on('data',b=>err+=b);child.on('close',code=>code?reject(Error(err)):resolve(JSON.parse(out)));child.stdin.end(JSON.stringify(payload));
});}
export async function database(t){
 const dir=await mkdtemp(join(tmpdir(),'retreat-booking-')),file=join(dir,'test.sqlite');t.after(()=>rm(dir,{recursive:true,force:true}));
 const folder=new URL('../migrations/',import.meta.url);let schema='';for(const name of (await readdir(folder)).sort())if(name.endsWith('.sql'))schema+=await readFile(new URL(name,folder),'utf8');
 await python({file,schema});
 return {prepare(sql){const statement={sql,args:[],bind(...a){statement.args=a;return statement;},run(){return python({file,sql,args:statement.args});},all(){return python({file,sql,args:statement.args});},async first(){return (await python({file,sql,args:statement.args})).results[0]||null;}};return statement;},batch(statements){return python({file,statements:statements.map(s=>({sql:s.sql,args:s.args}))});}};
}
