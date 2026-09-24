import { useEffect,useRef } from 'react';
import { EditorView,keymap } from '@codemirror/view';
import { basicSetup } from 'codemirror';
import { sql } from '@codemirror/lang-sql';
import { oneDark } from '@codemirror/theme-one-dark';
export function Editor({value,onChange,onRun}) {
  const host=useRef(null),view=useRef(null),callbacks=useRef({onChange,onRun});
  callbacks.current={onChange,onRun};
  useEffect(()=>{
    view.current=new EditorView({doc:value,parent:host.current,extensions:[basicSetup,sql(),oneDark,
      EditorView.contentAttributes.of({'aria-label':'SQL editor',spellcheck:'false'}),
      EditorView.theme({'&':{height:'100%',fontSize:'13px'},'.cm-scroller':{overflow:'auto',fontFamily:'Consolas, monospace'},'.cm-content':{padding:'16px 0'},'.cm-gutters':{background:'#151b24',border:'none'}}),
      EditorView.updateListener.of(update=>{if(update.docChanged)callbacks.current.onChange(update.state.doc.toString());}),
      keymap.of([{key:'Mod-Enter',run:()=>{callbacks.current.onRun();return true;}}])
    ]});
    return()=>view.current.destroy();
  },[]);
  useEffect(()=>{if(view.current && value!==view.current.state.doc.toString())view.current.dispatch({changes:{from:0,to:view.current.state.doc.length,insert:value}});},[value]);
  return <div className="editor-host" ref={host}/>;
}
