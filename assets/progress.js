'use strict';

// The original combined record remains readable. Each new write belongs to one lesson
// or one missed skill, so tabs working on different exercises cannot erase each other.
const CourseProgress = (() => {
  const legacyKey='table-study.foundations.v1';
  const prefix='table-study.foundations.v2.';
  const isRecord=value=>value && typeof value==='object' && !Array.isArray(value);
  function open(storage,unitIds,skillIds) {
    const saved={practice:{}};
    const previous=new Map();
    const fields=new Map([
      ...unitIds.map(id=>[prefix+'lesson.'+id,{id,group:'lesson'}]),
      ...skillIds.map(id=>[prefix+'skill.'+id,{id,group:'skill'}])
    ]);
    function legacy() {
      try {return JSON.parse(storage?.getItem(legacyKey)) || {};} catch {return {};}
    }
    function read(key,field,old) {
      let value;
      try {
        const raw=storage?.getItem(key);
        value=raw==null ? (field.group==='skill'?old.practice?.[field.id]:old[field.id]) : JSON.parse(raw);
      } catch {return null;}
      if(!isRecord(value) || !Number.isSafeInteger(value.seed) || value.seed<0)return null;
      if(field.group==='skill')return {seed:value.seed};
      if(!Number.isSafeInteger(value.at) || value.at<0)return null;
      const record={...value,done:value.done===true};
      const batch=record.lastBatch;
      if(batch && (![10,100].includes(batch.n) || !Number.isInteger(batch.hits) || batch.hits<0 || batch.hits>batch.n))delete record.lastBatch;
      return record;
    }
    function owner(field) {return field.group==='skill'?saved.practice:saved;}
    function refresh(key=null) {
      const changed=[];
      if(!storage)return changed;
      const old=legacy();
      for(const [name,field] of fields) {
        if(key!==null && key!==legacyKey && key!==name)continue;
        const value=read(name,field,old);
        const json=JSON.stringify(value);
        if(previous.get(name)===json)continue;
        previous.set(name,json);
        if(value===null)delete owner(field)[field.id];
        else owner(field)[field.id]=value;
        changed.push(field);
      }
      return changed;
    }
    function store() {
      for(const [key,field] of fields) {
        const value=owner(field)[field.id] ?? null;
        const json=JSON.stringify(value);
        if((previous.get(key) ?? 'null')===json)continue;
        // A null record masks a cleared legacy skill when the app is reopened.
        try {storage?.setItem(key,json);} catch {
          // Keep playing in memory even when storage is full or disabled.
          storage=null;
        }
        previous.set(key,json);
      }
    }
    refresh();
    return {saved,store,refresh};
  }
  // Serialize changes from two tabs when the browser grants access to Web Locks.
  function withLock(key, action) {
    let started=false;
    const run=()=>{started=true;return action();};
    function denied(error) {
      if (!started && ['SecurityError','NotAllowedError'].includes(error?.name)) return run();
      throw error;
    }
    try {
      const locks=globalThis.navigator?.locks;
      return locks ? locks.request(key,run).catch(denied) : run();
    } catch (error) {
      return denied(error);
    }
  }
  return {open,withLock};
})();
