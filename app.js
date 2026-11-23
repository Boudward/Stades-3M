/* STADES 3M – application – version 4.15.0 */
const INVITE=/type=(invite|recovery)/.test(location.hash); // lien d'invitation reçu par e-mail
const ENVS = window.STADES_ENVS, TITRE0 = document.title;
function envDuLien(){ // lien d'invitation ou de réinitialisation : la base est déduite de l'émetteur du jeton
 try{const t=(location.hash.match(/access_token=([^&]+)/)||[])[1];if(!t)return null;const p=JSON.parse(atob(t.split(".")[1].replace(/-/g,"+").replace(/_/g,"/")));for(const k in ENVS)if(p.iss&&p.iss.indexOf(new URL(ENVS[k].url).host)>=0)return k}catch(e){}return null}
let ENV = envDuLien() || sessionStorage.getItem("stades_env") || "prod";if(!ENVS[ENV])ENV="prod";
let sb = supabase.createClient(ENVS[ENV].url, ENVS[ENV].key);
function appliquerEnv(){sessionStorage.setItem("stades_env",ENV);const t=ENV==="test";document.getElementById("envb").classList.toggle("hide",!t);document.title=(t?"[TEST] ":"")+TITRE0;const p=document.getElementById("pdet");if(p)p.classList.toggle("hide",!PH())}
const $ = id => document.getElementById(id);
const ST = {nouvelle:"Nouveau",en_cours:"En cours",en_attente:"En attente",resolue:"Résolu",refusee:"Refusé",archivee:"Archivé"};
const PR = {basse:"Basse",normale:"Normale",haute:"Haute",urgente:"Urgente"};
const ROLES = {demandeur:"Demandeur",responsable:"Responsable",supervision:"Supervision",agent_travaux:"Agent bâtiment",agent_exploitation:"Agent exploitation",admin:"Admin"};
let me, sites=[], zoneL=[], tk=[], cur, signup=false, view="";
const esc = s => String(s??"").replace(/[&<>"]/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const opts = (o,all)=>(all?`<option value="">${all}</option>`:"")+Object.entries(o).map(([k,v])=>`<option value="${k}">${v}</option>`).join("");
const sOpts = (all)=>(all?`<option value="">${all}</option>`:"")+sites.filter(s=>s.actif!==false).map(s=>`<option value="${s.id}">${esc(s.nom)}</option>`).join("");
const tOpts = (sid,all)=>(all?`<option value="">${all}</option>`:"")+zoneL.filter(t=>t.actif!==false&&(!sid||t.site_id==sid)).map(t=>`<option value="${t.id}">${esc(t.nom)}</option>`).join("");
const siteN = id=>(sites.find(s=>s.id==id)||{}).nom||"?", zoneN = id=>(zoneL.find(t=>t.id==id)||{}).nom||"?";
const role = ()=> me.role==="admin" && view ? view : me.role;
$("np").innerHTML=opts(PR); $("np").value="normale";
document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>b.closest("dialog").close());

$("tog").onclick=()=>{signup=!signup;$("pwb").classList.toggle("hide",signup);$("lmsg").style.color="";$("sg").classList.toggle("hide",!signup);$("lt").textContent=signup?"Demande de création de compte":"Connexion";
 $("go").textContent=signup?"Envoyer la demande":"Se connecter";$("tog").textContent=signup?"J'ai déjà un compte":"Demander un compte";$("lmsg").textContent=""};
$("go").onclick=async()=>{$("lmsg").style.color="";
 const email=$("em").value,password=$("pw").value;
 if(signup){
  if(![$("sn"),$("sp"),$("ss"),$("sf"),$("em")].every(i=>i.value.trim())){$("lmsg").textContent="Renseignez tous les champs.";return}
  const {error}=await sb.from("demandes_compte").insert({nom:$("sn").value.trim(),prenom:$("sp").value.trim(),societe:$("ss").value.trim(),fonction:$("sf").value.trim(),email:email.trim()});
  if(error){$("lmsg").textContent="Demande impossible : "+errMsg(error);return}
  $("lmsg").style.color="var(--ok)";$("lmsg").textContent="Demande envoyée. L'administrateur l'examinera puis vous invitera par e-mail à choisir votre mot de passe.";return}
 const {error}=await sb.auth.signInWithPassword({email,password});
 if(error)$("lmsg").textContent=/fetch|network|NetworkError/i.test(error.message||"")?"Connexion au serveur impossible : vérifiez votre réseau et que le projet Supabase est actif.":"Connexion impossible : vérifiez l'e-mail et le mot de passe.";else start()};
$("out").onclick=async()=>{await sb.auth.signOut();location.reload()};


const ERRS={interv_bc_coherent:"Renseignez d'abord le numéro de bon de commande.",interv_facture_coherent:"La facture ne peut pas être « payée » sans être « reçue ».",interv_bc_longueur:"Le numéro de bon de commande doit comporter au moins 12 caractères.",interv_devis_coherent:"La date de réception du devis précède celle de la demande."};
function errMsg(e){const m=(e&&e.message)||String(e);if(/Could not find the '[^']+' column|schema cache/i.test(m))return "La base de données n'est pas à jour : exécutez la dernière migration SQL.";if(/JWT expired|invalid JWT/i.test(m))return "Votre session a expiré : reconnectez-vous.";for(const k in ERRS)if(m.includes(k))return ERRS[k];
 if(e.code==="23505")return "Cet élément existe déjà.";if(e.code==="23503")return "Cet élément est utilisé ailleurs : suppression impossible.";
 if(e.code==="42501"||/row-level security|permission denied/i.test(m))return "Action non autorisée pour votre profil.";if(/Failed to fetch|NetworkError/i.test(m))return "Connexion impossible : vérifiez votre réseau.";return m}
async function allRows(t){let r=[];for(let i=0;;i+=1000){const {data,error}=await sb.from(t).select("*").order("created_at",{ascending:false}).order("id",{ascending:false}).range(i,i+999);if(error)return{error};r=r.concat(data);if(data.length<1000)return{data:r}}}
let MM={};
const MB="Bonjour,\n\n{INTRO}\nObjet : {titre}\nConsignes : {consignes}\nLieu : {site}\nZone : {zone}\nLocal : {local}\nCorps d'état : {corps_etat}\nPriorité : {priorite}\nDate d'intervention : {echeance}\nDurée estimée : {duree}\n";
const MD={regie:{objet:"{SITE} - Intervention {ref} – {titre}",corps:MB.replace("{INTRO}","Nous vous confions l'intervention ci-dessous :")+"\n(Fiche d'intervention à joindre : bouton « Fiche PDF »)\n\nCordialement,\n{signataire}"},
 entreprise:{objet:"{SITE} - Intervention {ref} – {titre}",corps:MB.replace("{INTRO}","Nous vous confions l'intervention ci-dessous :")+"\nCordialement,\n{signataire}"},
 devis:{objet:"{SITE} - Demande de devis {ref} – {titre}",corps:MB.replace("{INTRO}","Nous vous remercions de nous adresser un devis pour l'intervention ci-dessous :")+"\nCordialement,\n{signataire}"}};
const MLAB={regie:"Régie – envoi aux agents",entreprise:"Entreprise – envoi de l'intervention",devis:"Entreprise – demande de devis"},mdl=k=>MM[k]||MD[k];
function fill(t,v){return t.split("\n").map(l=>{let h=0,f=0;const r=l.replace(/\{(\w+)\}/g,(_,n)=>{h=1;const x=v[n]||"";if(x)f=1;return x});return h&&!f?null:r}).filter(l=>l!==null).join("\r\n")}
function renderMM(){$("mmods").innerHTML=Object.keys(MLAB).filter(k=>FINANCES||k!=="devis").map(k=>{const m=mdl(k);return `<h4 style="margin:16px 0 0">${MLAB[k]}</h4><label>Objet</label><input data-mm="${k}" data-f="objet" value="${esc(m.objet)}"><label>Corps du message</label><textarea data-mm="${k}" data-f="corps" rows="10">${esc(m.corps)}</textarea><div class="row" style="margin-top:8px"><button data-k="${k}">Enregistrer</button><button class="sec" data-r="${k}">Rétablir le modèle d'origine</button></div>`}).join("")+`<p class="msg">Variables : {ref} {titre} {consignes} {site} {SITE} {zone} {local} {corps_etat} {priorite} {echeance} {signataire}. Une ligne dont toutes les variables sont vides est supprimée automatiquement.</p>`}
$("mmods").onclick=async e=>{const b=e.target.closest("button");if(!b)return;const k=b.dataset.k||b.dataset.r,q=f=>document.querySelector(`[data-mm="${k}"][data-f="${f}"]`).value;
 const row=b.dataset.k?{cle:k,objet:q("objet"),corps:q("corps")}:{cle:k,...MD[k]};if(!row.objet.trim()||!row.corps.trim()){$("mmmsg").style.color="";$("mmmsg").textContent="L'objet et le corps sont obligatoires.";return}
 const {error}=await sb.from("modeles_mail").upsert({...row,updated_at:new Date().toISOString()});$("mmmsg").style.color=error?"":"var(--ok)";$("mmmsg").textContent=error?errMsg(error):"Modèle enregistré.";if(!error){MM[k]=row;renderMM()}};
const TRASH='<svg class="ico" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 14h10l1-14"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>';
const XCL='<button type="button" class="ic" data-close title="Fermer" aria-label="Fermer">✕</button>',XFOOT='<div class="row xfoot"><button type="button" class="sec" data-close>Fermer</button></div>';
const IC=(a,i,t)=>{const m={e:["✎","Renommer"],x:[TRASH,"Supprimer"],r:["↺","Réactiver"]}[a];return `<button class="ic" title="${m[1]}" aria-label="${m[1]}" data-a="${a}" data-t="${t}" data-i="${i}">${m[0]}</button>`};
function renderGrids(){const row=(t,x,d)=>`<div class="gr${x.actif===false?" off":""}"><span>${esc(x.nom)}</span><span>${t==="corps_etat"?refSel(x,d):""}${x.actif===false?IC("r",x.id,t):IC("e",x.id,t)}${IC("x",x.id,t)}</span></div>`,
 add=(ph,t,p)=>`<div class="gadd"><input placeholder="${ph}" data-n aria-label="${ph}"><button data-add="${t}" data-p="${p}" aria-label="${ph}">+</button></div>`;
 $("clists").innerHTML=`<div class="grid" style="grid-template-columns:repeat(${cats.length||1},minmax(0,1fr))">`+cats.map(c=>`<div class="gc"><h4>${esc(c.nom)}</h4>${corps.filter(x=>x.categorie_id===c.id).map(x=>row("corps_etat",x,c.domaine)).join("")}${add("Nouveau lot","corps_etat",c.id)}</div>`).join("")+`</div>`;
 $("lists").innerHTML=`<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(240px,1fr))">`+sites.map(s=>`<div class="gc"><h4><span>${esc(s.nom)}${s.actif===false?" (désactivé)":""}</span><span>${s.actif===false?IC("r",s.id,"sites"):IC("e",s.id,"sites")}${IC("x",s.id,"sites")}</span></h4>${zoneL.filter(t=>t.site_id===s.id).map(t=>row("zones",t)).join("")}${add("Nouvelle zone","zones",s.id)}</div>`).join("")+`</div>`}
async function gridClick(e){const b=e.target.closest("button");if(!b)return;const d=b.dataset;
 if(d.add){const n=b.previousElementSibling.value.trim();if(n)adm(sb.from(d.add).insert({[d.add==="corps_etat"?"categorie_id":"site_id"]:+d.p,nom:n}));return}
 if(d.a==="e"){const o=(d.t==="sites"?sites:d.t==="zones"?zoneL:corps).find(x=>x.id==d.i),n=(prompt("Nouveau nom :",o.nom)||"").trim();if(n&&n!==o.nom)adm(sb.from(d.t).update({nom:n}).eq("id",d.i))}
 else if(d.a==="r")adm(sb.from(d.t).update({actif:true}).eq("id",d.i));
 else if(d.a==="x"){if(!confirm("Supprimer cet élément ?"))return;const {error}=await sb.from(d.t).delete().eq("id",d.i);
  if(error&&error.code==="23503"){if(confirm("Cet élément est utilisé par des tickets ou des interventions : il ne peut pas être supprimé.\nLe désactiver à la place (il disparaîtra des listes de choix) ?"))adm(sb.from(d.t).update({actif:false}).eq("id",d.i));return}
  adm(Promise.resolve({error}))}}
$("clists").onclick=$("lists").onclick=gridClick;
$("clists").onchange=e=>{const t=e.target;if(t.dataset.ref)adm(sb.from("corps_etat").update({referent_id:t.value||null}).eq("id",t.dataset.ref))};
$("ad").addEventListener("keydown",e=>{if(e.key==="Enter"&&e.target.dataset.n!==undefined){e.preventDefault();e.target.nextElementSibling.click()}});
$("dPw").addEventListener("cancel",e=>e.preventDefault());
sb.auth.onAuthStateChange(ev=>{if(ev==="SIGNED_OUT"&&me)location.reload()});
$("fgt").onclick=async()=>{const m=$("em").value.trim();$("lmsg").style.color="";if(!m){$("lmsg").textContent="Saisissez d'abord votre adresse e-mail.";return}
 const {error}=await sb.auth.resetPasswordForEmail(m,{redirectTo:location.origin+location.pathname});$("lmsg").style.color=error?"":"var(--ok)";$("lmsg").textContent=error?errMsg(error):"Si cette adresse correspond à un compte, un lien de réinitialisation vient d'être envoyé."};

let NT=[],dtm;
async function loadNot(){const {data,error}=await sb.from("notifications").select("*").order("created_at",{ascending:false}).limit(50);if(error)return;NT=data;const n=NT.filter(x=>!x.lu).length;$("bn").textContent=n>99?"99+":n;$("bn").classList.toggle("hide",!n)}
function drawNot(){$("dNb").innerHTML=NT.map(x=>`<div class="tl${x.lu?"":" nt"}" data-n="${x.id}" data-y="${x.type||""}" data-t="${x.ticket_id||""}" data-i="${x.intervention_id||""}" style="cursor:pointer"><span>${tlTime(x.created_at)}</span><b>${esc(x.titre)}</b>${x.message?" – "+esc(x.message):""}</div>`).join("")||`<p class="empty" style="padding:8px">Aucune notification.</p>`}
$("bell").onclick=()=>{drawNot();$("dNot").showModal()};
$("dNa").onclick=async()=>{await sb.rpc("notif_lire");await loadNot();drawNot()};
$("dNb").onclick=e=>{const r=e.target.closest("[data-n]");if(!r)return;const d=r.dataset;sb.rpc("notif_lire",{p_id:+d.n}).then(loadNot);$("dNot").close();
 if(d.y==="demande_compte"){if(me.role==="admin"&&$("ad").classList.contains("hide"))$("adm").click();return}
 const i=d.i&&ints.find(x=>x.id==d.i),t=d.t&&tk.find(x=>x.id==d.t);if(i)openIv(i);else if(t)openDet(t.id)};
const dirty=()=>{clearTimeout(dtm);dtm=setTimeout(()=>{if(!document.querySelector("dialog[open]"))load()},1500)};
function live(){setInterval(loadNot,60000);setInterval(sugAlert,60000);sugAlert();sb.channel("stades").on("postgres_changes",{event:"INSERT",schema:"public",table:"notifications",filter:`user_id=eq.${me.id}`},()=>{loadNot();dirty()})
 .on("postgres_changes",{event:"*",schema:"public",table:"tickets"},dirty).on("postgres_changes",{event:"*",schema:"public",table:"interventions"},dirty).subscribe()}
const AL={titre:"Titre",consignes:"Consignes",priorite:"Priorité",echeance:"Date d'intervention",duree_j:"Durée (jours)",duree_h:"Durée (ancienne saisie, en heures)",etat:"État",local:"Local",site_id:"Site",zone_id:"Zone",agent_ids:"Intervenants",responsable_nom:"Responsable",entreprise_id:"Entreprise",prestataire:"Prestataire",prestataire_email:"E-mail entreprise",devis_demande_at:"Devis demandé",devis_recu_at:"Devis reçu",bc_numero:"N° bon de commande",bc_envoye_at:"BC envoyé",facture_recue:"Facture reçue",facture_payee:"Facture payée",montant_devis_ht:"Devis HT",montant_bc_ht:"BC HT",montant_facture_ht:"Facture HT"};
const vv=(k,v)=>v==null||v===""?"—":k==="etat"?ET[v]||v:k==="priorite"?PR[v]||v:k==="duree_h"?`${v} h`:k==="duree_j"?fduree(v):/_at$|echeance/.test(k)?fdate(v):k.startsWith("montant")?eur(v):k==="entreprise_id"?((ents.find(e=>e.id==v)||{}).entreprise||"?"):k==="site_id"?siteN(v):k==="zone_id"?zoneN(v):k==="agent_ids"?(v.map(i=>{const p=agents.find(a=>a.id===i);return p?(p.prenom+" "+p.nom).trim():"?"}).join(", ")||"—"):String(v);
async function loadH(){const {data}=await sb.from("audit_log").select("*").eq("table_name","interventions").eq("num_id",curI.id).order("created_at",{ascending:false}).limit(60);if(!$("ih"))return;
 $("ih").innerHTML=(data||[]).map(a=>{const ch=a.action==="MAIL"?["Envoi d'e-mail à "+((a.changes||{}).destinataires||"—")+" – « "+((a.changes||{}).objet||"")+" »"]:a.action==="INSERT"?["Intervention créée"]:Object.entries(a.changes||{}).filter(([k])=>AL[k]).map(([k,v])=>`${AL[k]} : ${vv(k,v[0])} → ${vv(k,v[1])}`);
  return ch.length?`<div class="tl"><span>${tlTime(a.created_at)}</span><b>${esc(a.par_nom||"Système")}</b> : ${esc(ch.join(" ; "))}</div>`:""}).join("")||`<p class="empty" style="padding:8px">Aucune modification enregistrée.</p>`}

async function renderAff(){const [a,p]=await Promise.all([sb.from("affectations").select("*"),sb.from("profiles").select("id,prenom,nom,role").eq("actif",true).in("role",["admin","responsable"])]);
 const A=a.data||[],Pf=p.data||[];
 RF=Pf;renderGrids();$("affb").innerHTML=`<table><thead><tr><th>Site</th><th>Responsable désigné pour ce site</th></tr></thead><tbody>`+sites.filter(s=>s.actif!==false).map(s=>{const c=(A.find(x=>x.site_id===s.id)||{}).profile_id;return `<tr><td>${esc(s.nom)}</td><td><select data-s="${s.id}" aria-label="Responsable – ${esc(s.nom)}"><option value="">— Aucun (référent du corps d'état) —</option>${Pf.map(x=>`<option value="${x.id}"${x.id===c?" selected":""}>${esc((x.prenom+" "+x.nom).trim())}</option>`).join("")}</select></td></tr>`}).join("")+`</tbody></table>`}
$("affb").onchange=e=>{const t=e.target,s=+t.dataset.s;adm(t.value?sb.from("affectations").upsert({site_id:s,profile_id:t.value}):sb.from("affectations").delete().eq("site_id",s))};
const LB={...AL,role:"Rôle",actif:"Actif",nom:"Nom",prenom:"Prénom",email:"E-mail",societe:"Société",fonction:"Fonction",entreprise:"Entreprise",contact:"Contact",mobile:"Mobile",profile_id:"Responsable",referent_id:"Référent",domaine:"Domaine",site_defaut_id:"Site par défaut",ref:"N°"};
const av=(k,v)=>k==="role"?(ROLES[v]||v||"—"):k==="actif"?(v?"oui":"non"):(k==="profile_id"||k==="referent_id")?((p=>p?(p.prenom+" "+p.nom).trim():"?")(agents.find(a=>a.id===v))):k==="site_defaut_id"?(v?siteN(v):"—"):typeof v==="object"&&v!==null?"…":vv(k,v);
async function renderAud(){let q=sb.from("audit_log").select("*").order("created_at",{ascending:false}).limit(150);if($("afl").value)q=q.eq("table_name",$("afl").value);const {data,error}=await q;
 if(error){$("arows").innerHTML=`<tr><td colspan="5">${esc(errMsg(error))}</td></tr>`;return}
 const TN={interventions:"Intervention",profiles:"Utilisateur",entreprises:"Entreprise",affectations:"Affectation",corps_etat:"Corps d'état"},AC={INSERT:"Création",UPDATE:"Modification",DELETE:"Suppression",MAIL:"E-mail"},HID=["id","created_at","updated_at","prefs","terminee_at","cree_par","agents_noms"];
 $("arows").innerHTML=(data||[]).map(a=>{const c=a.changes||{},d=a.action==="UPDATE"?Object.entries(c).map(([k,v])=>`${LB[k]||k} : ${av(k,v[0])} → ${av(k,v[1])}`):Object.entries(c).filter(([k,v])=>v!=null&&v!==""&&!HID.includes(k)).slice(0,5).map(([k,v])=>`${LB[k]||k} : ${av(k,v)}`);
  return `<tr><td>${tlTime(a.created_at)}</td><td>${esc(a.par_nom||"Système")}</td><td>${TN[a.table_name]||esc(a.table_name)}${a.table_name==="interventions"?" n°"+esc(a.row_id):""}</td><td>${AC[a.action]||a.action}</td><td>${esc(d.join(" ; ").slice(0,240))}</td></tr>`}).join("")||`<tr><td colspan="5" class="empty">Aucune entrée.</td></tr>`}
$("afl").onchange=$("abtn").onclick=renderAud;$("adet").addEventListener("toggle",()=>{if($("adet").open)renderAud()});
let DP="all";
const SC={nouvelle:"#102d69",en_cours:"#3b82c4",en_attente:"#c8641b",resolue:"#2e8b3c",refusee:"#b3261e",archivee:"#8a99a3"},EC={a_planifier:"#b7791f",planifiee:"#3b82c4",en_attente_pieces:"#c8641b",en_cours:"#102d69",terminee:"#2e8b3c",annulee:"#8a99a3"};
const dDeb=()=>{if(DP==="year")return new Date().getFullYear()+"-01-01";if(DP==="30"){const d=new Date();d.setDate(d.getDate()-30);return d.toLocaleDateString("sv-SE")}return null};
function donut(items){const tot=items.reduce((a,x)=>a+x.v,0);if(!tot)return '<p class="empty">Aucune donnée.</p>';let off=0;
 const arcs=items.filter(x=>x.v).map(x=>{const p=x.v/tot*100,s=`<circle r="15.9155" cx="21" cy="21" fill="none" stroke="${x.c}" stroke-width="6" stroke-dasharray="${p} ${100-p}" stroke-dashoffset="${25-off}"><title>${esc(x.l)} : ${x.v}</title></circle>`;off+=p;return s}).join("");
 return `<div class="row" style="align-items:center;flex-wrap:nowrap"><svg viewBox="0 0 42 42" width="130" height="130" role="img" aria-label="Répartition">${arcs}<text x="21" y="22.6" text-anchor="middle" font-size="7" font-weight="700" fill="#1c2b33">${tot}</text></svg><div style="font-size:13px">${items.map(x=>`<div><span style="display:inline-block;width:10px;height:10px;background:${x.c};margin-right:6px"></span>${esc(x.l)} : <b>${x.v}</b></div>`).join("")}</div></div>`}
const bars=(items,col)=>{const mx=Math.max(1,...items.map(x=>x.v));return items.length?items.map(x=>`<div style="margin:5px 0"><div style="display:flex;justify-content:space-between;font-size:13px"><span>${esc(x.l)}</span><b>${x.v}</b></div><div style="background:#e8ecf3;border-radius:4px;height:10px"><div style="width:${x.v/mx*100}%;background:${col};height:10px;border-radius:4px"></div></div></div>`).join(""):'<p class="empty">Aucune donnée.</p>'};
function cols(S){if(!S.length)return '<p class="empty">Aucune donnée.</p>';const W=600,H=170,L=28,B=22,n=S.length,mx=Math.max(1,...S.flatMap(x=>[x.crees,x.resolus])),bw=(W-L)/n,y=v=>H-B-v/mx*(H-B-12),day=n>14;
 const lab=x=>{const d=new Date(x.d+"T00:00:00");return day?d.getDate():d.toLocaleDateString("fr-FR",{month:"short"})};
 return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Évolution dans le temps"><line x1="${L}" y1="${H-B}" x2="${W}" y2="${H-B}" stroke="#d3d9e6"/><text x="0" y="12" font-size="10" fill="#5d6e77">${mx}</text>`+S.map((x,i)=>{const X=L+i*bw,w=Math.max(2,bw*.38);
  return `<rect x="${X+bw*.1}" y="${y(x.crees)}" width="${w}" height="${H-B-y(x.crees)}" fill="#102d69"><title>${x.crees} créé(s)</title></rect><rect x="${X+bw*.1+w+1}" y="${y(x.resolus)}" width="${w}" height="${H-B-y(x.resolus)}" fill="#2e8b3c"><title>${x.resolus} résolu(s)</title></rect>${(!day||i%5===0)?`<text x="${X+bw/2}" y="${H-6}" font-size="9" text-anchor="middle" fill="#5d6e77">${lab(x)}</text>`:""}`}).join("")+`</svg><div class="meta"><span style="color:#102d69">■</span> créés &nbsp; <span style="color:#2e8b3c">■</span> résolus</div>`}
const setP=()=>[...$("dper").children].forEach(b=>b.classList.toggle("sec",b.dataset.p!==DP));
const fDel=v=>v==null?"—":(+v<1?Math.round(+v*24)+" h":(+v).toLocaleString("fr-FR",{maximumFractionDigits:1})+" j");
async function loadDash(){$("dDb").innerHTML='<p class="empty">Chargement…</p>';const {data:d,error}=await sb.rpc("stats_tableau_bord",{p_debut:dDeb()});
 if(error){$("dDb").textContent=errMsg(error)+" (la migration SQL du tableau de bord est peut-être à exécuter)";return}
 const T=d.tickets_par_statut||{},I=d.interventions_par_etat||{},tile=(n,l,w)=>`<div class="gc" style="padding:10px;text-align:center${w?";border-color:var(--warn)":""}"><div style="font-size:26px;font-weight:700;color:${w?"var(--warn)":"var(--accent)"}">${n??"—"}</div><div class="meta">${l}</div></div>`,box=(t,b,full)=>`<div class="gc"${full?' style="grid-column:1/-1"':""}><h4>${t}</h4><div style="padding:10px">${b}</div></div>`,
 g=(m,x)=>`<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(${m}px,1fr));margin-top:${x}px">`;
 $("dDb").innerHTML=`${g(130,0)}${tile(d.tickets_total,"Tickets")}${tile(fDel(d.delai_prise_en_charge_jours),"Délai de prise en charge ticket")}${tile(d.delai_moyen_jours==null?"—":d.delai_moyen_jours+" j","Délai moyen de résolution")}${tile(d.interventions_total,"Interventions")}${tile(fDel(d.delai_demarrage_jours),"Délai démarrage intervention")}</div>
 ${g(320,14)}${box("Tickets par statut",donut(Object.keys(ST).map(k=>({l:ST[k],v:T[k]||0,c:SC[k]}))))}${box("Interventions par état",donut(Object.keys(ET).map(k=>({l:ET[k],v:I[k]||0,c:EC[k]}))))}${box("Tickets par catégorie",bars((d.tickets_par_categorie||[]).map(x=>({l:x.nom,v:x.n})),"#102d69"))}${box("Tickets par site",bars((d.tickets_par_site||[]).map(x=>({l:x.nom,v:x.n})),"#3b82c4"))}${box("Évolution des tickets "+(d.serie_unite==="day"?"(par jour)":DP==="all"?"(par mois, 12 derniers mois)":"(par mois)"),cols(d.serie||[]),true)}</div>`}
$("dash").onclick=()=>{$("dDash").showModal();setP();loadDash()};
$("dper").onclick=e=>{const b=e.target.closest("button");if(!b)return;DP=b.dataset.p;setP();loadDash()};

// ===== PHOTOS (essai – activées uniquement sur la base de test, voir config.js) =====
const PHN=10,phKo=o=>Math.round(o/1024),phStaff=()=>["admin","responsable"].includes(me.role);
let PHMAX=409600,PHCL=2048000,PHL=[],PHT=[],PHS=[],PHZ="o",PHC=null,PHI=0,PHU={};
function PH(){return !(ENVS[ENV]&&ENVS[ENV].photos===false)}
const TBX=()=>PH()?[...TBK,"parametres","photos"]:TBK;
const dlB=(b,n)=>{const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=n;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),6e4)};
// archive ZIP minimale (sans compression : les photos sont déjà des JPEG)
const CRCT=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
const crc32=u=>{let c=0xFFFFFFFF;for(let i=0;i<u.length;i++)c=CRCT[(c^u[i])&255]^(c>>>8);return(c^0xFFFFFFFF)>>>0};
function zipBlob(es){const enc=new TextEncoder(),parts=[],cen=[],d=new Date(),dt=((d.getFullYear()-1980)<<9)|((d.getMonth()+1)<<5)|d.getDate(),tm=(d.getHours()<<11)|(d.getMinutes()<<5)|(d.getSeconds()>>1);let off=0;
 for(const e of es){const nm=enc.encode(e.name),crc=crc32(e.buf),sz=e.buf.length,h=new DataView(new ArrayBuffer(30));
  h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint16(6,0x0800,true);h.setUint16(10,tm,true);h.setUint16(12,dt,true);h.setUint32(14,crc,true);h.setUint32(18,sz,true);h.setUint32(22,sz,true);h.setUint16(26,nm.length,true);
  parts.push(h.buffer,nm,e.buf);
  const c=new DataView(new ArrayBuffer(46));c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x0800,true);c.setUint16(12,tm,true);c.setUint16(14,dt,true);c.setUint32(16,crc,true);c.setUint32(20,sz,true);c.setUint32(24,sz,true);c.setUint16(28,nm.length,true);c.setUint32(42,off,true);
  cen.push(c.buffer,nm);off+=30+nm.length+sz}
 let cl=0;cen.forEach(x=>cl+=x.byteLength);const z=new DataView(new ArrayBuffer(22));z.setUint32(0,0x06054b50,true);z.setUint16(8,es.length,true);z.setUint16(10,es.length,true);z.setUint32(12,cl,true);z.setUint32(16,off,true);
 return new Blob([...parts,...cen,z.buffer],{type:"application/zip"})}
async function phCfg(){if(!PH())return;const {data}=await sb.from("parametres").select("cle,valeur").in("cle",["photo_max_octets","photo_cloture_max_octets"]);(data||[]).forEach(r=>{if(+r.valeur>0){if(r.cle==="photo_max_octets")PHMAX=+r.valeur;else PHCL=+r.valeur}});if($("phko")){$("phko").value=phKo(PHMAX);$("phko").oninput();$("phkoc").value=phKo(PHCL);$("phkoc").oninput()}}
async function phInit(){const p=$("pdet");if(p)p.classList.toggle("hide",!PH());if(!PH())return;await phCfg();if(phStaff())phVider()}
function phCan(k,o){if(k==="t")return phStaff()||(o.demandeur_id===me.id&&["demandeur","responsable"].includes(me.role)&&o.statut!=="archivee");return phStaff()||(["agent_travaux","agent_exploitation"].includes(me.role)&&(o.agent_ids||[]).includes(me.id)&&!["terminee","annulee"].includes(o.etat))}
const phCanDel=p=>phStaff()||p.auteur_id===me.id;
async function phUrls(l){const now=Date.now(),need=l.filter(p=>!PHU[p.chemin]||PHU[p.chemin].exp<now+6e4);if(!need.length)return;const r=await sb.storage.from("photos").createSignedUrls(need.map(p=>p.chemin),3600);(r.data||[]).forEach(x=>{if(x.signedUrl)PHU[x.path]={u:x.signedUrl,exp:now+36e5}})}
const phGrid=(l,z)=>`<div class="phg">${l.map((p,i)=>`<button type="button" class="ph" data-ph="${i}" data-pz="${z}" aria-label="Agrandir la photo ${i+1}"><img src="${esc((PHU[p.chemin]||{}).u||"")}" alt="Photo ${i+1}" loading="lazy"></button>`).join("")}</div>`;
async function phRender(k,o,ed){if(!PH()||!$("phz"))return;PHC={k,o,ed:!!ed};const col=k==="t"?"ticket_id":"intervention_id";
 const {data,error}=await sb.from("photos").select("*").eq(col,o.id).order("created_at");if(!$("phz"))return;
 if(error){$("phz").innerHTML=`<h3>Photos</h3><p class="msg">${esc(errMsg(error))}</p>`;return}
 PHL=data||[];await phUrls(PHL);const z=$("phz");if(!z)return;const can=phCan(k,o);
 z.innerHTML=(PHL.length?`<h3>Photos (${PHL.length})</h3>${phGrid(PHL,"o")}${ed&&PHL.some(phCanDel)?`<p class="meta">Ouvrez une photo pour la supprimer.</p>`:""}`:"")
 +(can&&PHL.length<PHN?`<label class="phadd">Ajouter des photos<input type="file" id="phf" accept="image/*" multiple></label>`:"")+`<p class="msg" id="phm"></p>`}
async function phRenderT(o){if(!PH()||!$("phzt")||!o.ticket_id)return;const {data}=await sb.from("photos").select("*").eq("ticket_id",o.ticket_id).order("created_at");PHT=data||[];await phUrls(PHT);const z=$("phzt");if(!z)return;
 z.innerHTML=PHT.length?`<h3>Photos du ticket (${PHT.length})</h3>${phGrid(PHT,"t")}`:""}
async function phCompress(file,max){let bmp;
 try{bmp=await createImageBitmap(file,{imageOrientation:"from-image"})}catch(_){bmp=await new Promise((res,rej)=>{const u=URL.createObjectURL(file),im=new Image();im.onload=()=>{URL.revokeObjectURL(u);res(im)};im.onerror=()=>{URL.revokeObjectURL(u);rej(new Error("Format d'image non pris en charge (utilisez JPEG ou PNG)"))};im.src=u})}
 const W0=bmp.width||bmp.naturalWidth,H0=bmp.height||bmp.naturalHeight;if(!W0||!H0)throw new Error("Image illisible");
 const cv=document.createElement("canvas"),cx=cv.getContext("2d");let side=Math.min(max>1048576?3200:2048,Math.max(W0,H0)),q=.85;
 for(let n=0;n<40;n++){const s=Math.min(1,side/Math.max(W0,H0)),w=Math.max(1,Math.round(W0*s)),h=Math.max(1,Math.round(H0*s));cv.width=w;cv.height=h;cx.fillStyle="#fff";cx.fillRect(0,0,w,h);cx.drawImage(bmp,0,0,w,h);
  const blob=await new Promise(r=>cv.toBlob(r,"image/jpeg",q));if(!blob)throw new Error("Compression impossible sur cet appareil");
  if(blob.size<=max){if(bmp.close)bmp.close();return{blob,w,h}}
  if(q>.56)q=Math.round((q-.1)*100)/100;else{side=Math.round(side*.85);q=.8;if(side<400)break}}
 if(bmp.close)bmp.close();throw new Error(`Impossible de réduire cette photo à ${phKo(max)} Ko`)}
async function phPut(col,id,p,opt){opt=opt||{};const k=col==="ticket_id"?"t":"i",path=`${k}${id}/${crypto.randomUUID()}.jpg`;
 try{const up=await sb.storage.from("photos").upload(path,p.blob,{contentType:"image/jpeg",upsert:false});if(up.error)throw up.error;
  const ins=await sb.from("photos").insert({[col]:id,chemin:path,taille_octets:p.blob.size,largeur:p.w,hauteur:p.h,cloture:!!opt.cloture});
  if(ins.error){await sb.from("photos_supprimees").insert({chemin:path});await phVider();throw ins.error}return null}catch(e){return errMsg(e)}}
async function phSend(k,id,files,msg,opt){opt=opt||{};const col=k==="t"?"ticket_id":"intervention_id",bad=[];let ok=0;
 for(let i=0;i<files.length;i++){const f=files[i],pre=`Photo ${i+1}/${files.length} : `;
  try{msg.textContent=pre+"compression…";const {blob,w,h}=await phCompress(f,opt.max||PHMAX);msg.textContent=pre+"envoi…";
   const r=await phPut(col,id,{blob,w,h},opt);if(r)throw new Error(r);ok++}
  catch(e){bad.push(`${f.name||"photo"} : ${errMsg(e)}`)}}
 return{ok,bad}}
// ----- photos en attente : création d'un ticket ou d'une intervention (envoyées dès que la fiche existe) -----
let PHST={n:[],i:[]};
const phStId=k=>k==="n"?"nph":"iph",phStMsg=k=>k==="n"?"nphm":"iphm";
function phStageClear(k){(PHST[k]||[]).forEach(p=>URL.revokeObjectURL(p.url));PHST[k]=[];phStageRender(k)}
function phStageRender(k){const z=$(k==="n"?"nphs":"phzs");if(!z)return;const L=PHST[k];
 z.innerHTML=(L.length?`<h3>Photos (${L.length})</h3><div class="phg">${L.map((p,i)=>`<div class="phw"><button type="button" class="ph" data-ph="${i}" data-pz="s${k}" aria-label="Agrandir la photo ${i+1}"><img src="${p.url}" alt="Photo ${i+1}"></button><button type="button" class="ic phx" data-phx="${i}" data-pk="${k}" title="Retirer cette photo" aria-label="Retirer la photo ${i+1}">${TRASH}</button></div>`).join("")}</div>`:"")
 +(L.length<PHN?`<label class="phadd">Ajouter des photos<input type="file" id="${phStId(k)}" accept="image/*" multiple></label>`:"")+`<p class="msg" id="${phStMsg(k)}"></p>`}
async function phStagePick(k,inp){const fs=[...inp.files];inp.value="";if(!fs.length)return;const room=Math.max(0,PHN-PHST[k].length),take=fs.slice(0,room),bad=[],m=$(phStMsg(k));
 for(let n=0;n<take.length;n++){const f=take[n];if(m)m.textContent=`Photo ${n+1}/${take.length} : compression…`;
  try{const {blob,w,h}=await phCompress(f,PHMAX);PHST[k].push({blob,w,h,url:URL.createObjectURL(blob),name:f.name||"photo",taille_octets:blob.size,auteur:nm(),created_at:new Date().toISOString()})}catch(e){bad.push(`${f.name||"photo"} : ${errMsg(e)}`)}}
 phStageRender(k);const m2=$(phStMsg(k));if(m2)m2.textContent=(fs.length>take.length?`${fs.length-take.length} ignorée(s) (maximum ${PHN} par fiche). `:"")+bad.join(" · ")}
async function phStageSend(k,col,id,msg){const L=PHST[k],bad=[];let ok=0;for(let i=0;i<L.length;i++){if(msg)msg.textContent=`Envoi des photos ${i+1}/${L.length}…`;const r=await phPut(col,id,L[i]);if(r)bad.push(`${L[i].name} : ${r}`);else ok++}return{ok,bad}}
async function phUpload(inp){const fs=[...inp.files];inp.value="";if(!fs.length||!PHC)return;const {k,o}=PHC,room=PHN-PHL.length,sel=fs.slice(0,Math.max(room,0));
 const r=await phSend(k,o.id,sel,$("phm"));await phRender(k,o,PHC.ed);const n=$("phm");if(!n)return;n.style.color=r.bad.length?"":"var(--ok)";
 n.textContent=(r.ok?`${r.ok} photo(s) ajoutée(s). `:"")+(fs.length>sel.length?`${fs.length-sel.length} ignorée(s) (maximum ${PHN} par fiche). `:"")+r.bad.join(" · ")}
function phOpen(i,z){PHZ=z||"o";PHS=PHZ==="t"?PHT:PHZ==="sn"?PHST.n:PHZ==="si"?PHST.i:PHL;PHI=i;phShow();$("dPh").showModal()}
function phShow(){const p=PHS[PHI];if(!p)return;$("phimg").src=p.url||(PHU[p.chemin]||{}).u||"";$("phimg").alt=`Photo ${PHI+1} sur ${PHS.length}`;$("phinfo").textContent=`${PHZ==="t"?"Photo du ticket":PHZ[0]==="s"?"Photo à envoyer":p.cloture?"Photo de clôture":"Photo"} ${PHI+1}/${PHS.length} · ${p.auteur||"—"} · ${tlTime(p.created_at)} · ${phKo(p.taille_octets)} Ko`;$("php").disabled=PHI===0;$("phn").disabled=PHI>=PHS.length-1;$("phd").classList.toggle("hide",!(PHZ[0]==="s"||(PHZ==="o"&&PHC&&PHC.ed&&phCanDel(p))))}
async function phDel(){const p=PHS[PHI];if(PHZ[0]==="s"){const k=PHZ==="sn"?"n":"i";if(p){URL.revokeObjectURL(p.url);PHST[k].splice(PHI,1)}$("dPh").close();phStageRender(k);return}if(PHZ!=="o"||!PHC||!PHC.ed||!p||!confirm("Supprimer définitivement cette photo ?"))return;const {data,error}=await sb.from("photos").delete().eq("id",p.id).select("id");
 if(error){alert(errMsg(error));return}if(!data||!data.length){alert("Suppression non autorisée.");return}await phVider();$("dPh").close();if(PHC)await phRender(PHC.k,PHC.o,PHC.ed)}
async function phVider(){if(!PH())return;try{for(let g=0;g<20;g++){const {data}=await sb.from("photos_supprimees").select("chemin").limit(100);if(!data||!data.length)return;const ch=data.map(x=>x.chemin),r=await sb.storage.from("photos").remove(ch);if(r.error)return;await sb.from("photos_supprimees").delete().in("chemin",ch)}}catch(_){}}
document.addEventListener("change",e=>{const i=e.target.id;if(i==="phf")phUpload(e.target);else if(i==="nph")phStagePick("n",e.target);else if(i==="iph")phStagePick("i",e.target)});
document.addEventListener("click",e=>{const x=e.target.closest("[data-phx]");if(x){const k=x.dataset.pk,p=PHST[k][+x.dataset.phx];if(p){URL.revokeObjectURL(p.url);PHST[k].splice(+x.dataset.phx,1)}phStageRender(k);return}const b=e.target.closest("[data-ph]");if(b)phOpen(+b.dataset.ph,b.dataset.pz)});
$("php").onclick=()=>{if(PHI>0){PHI--;phShow()}};$("phn").onclick=()=>{if(PHI<PHS.length-1){PHI++;phShow()}};$("phd").onclick=phDel;
$("dPh").addEventListener("keydown",e=>{if(e.key==="ArrowLeft")$("php").click();if(e.key==="ArrowRight")$("phn").click()});
$("phko").oninput=()=>{const k=+$("phko").value;$("phinfo2").textContent=k>0?`= ${(k*1024).toLocaleString("fr-FR")} octets`:""};
$("phkoc").oninput=()=>{const k=+$("phkoc").value;$("phinfoc").textContent=k>0?`= ${(k*1024).toLocaleString("fr-FR")} octets`:""};
$("phsave").onclick=async()=>{const k=Math.round(+$("phko").value),kc=Math.round(+$("phkoc").value),m=$("phmsg");m.style.color="";
 if(!(k>=50&&k<=2048)){m.textContent="Poids d'une photo : indiquez une valeur comprise entre 50 et 2048 Ko.";return}
 if(!(kc>=50&&kc<=5000)){m.textContent="Poids d'une photo de clôture : indiquez une valeur comprise entre 50 et 5000 Ko.";return}
 const {error}=await sb.from("parametres").upsert([{cle:"photo_max_octets",valeur:k*1024,updated_by:me.id},{cle:"photo_cloture_max_octets",valeur:kc*1024,updated_by:me.id}]);if(error){m.textContent=errMsg(error);return}
 PHMAX=k*1024;PHCL=kc*1024;m.style.color="var(--ok)";m.textContent=`Enregistré : ${k} Ko par photo et ${kc} Ko par photo de clôture. S'applique aux prochaines photos.`};
const dl=(o,n)=>{const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(o)],{type:"application/json"}));a.download=n;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),4e3)};
async function tbl(t,ord){let r=[];for(let i=0;;i+=1000){const {data,error}=await sb.from(t).select("*").order(ord).range(i,i+999);if(error)throw error;r=r.concat(data);if(data.length<1000)return r}}
const TBK=["sites","zones","categories","corps_etat","entreprises","affectations","modeles_mail","profiles","tickets","ticket_suivi","ticket_events","interventions","intervention_notes","suggestions","demandes_compte","audit_log","plans_preventifs","plans_modeles"],OB={affectations:"site_id",modeles_mail:"cle",parametres:"cle"};
async function renderVol(){const {data,error}=await sb.rpc("donnees_volumes");if(error){$("dvol").textContent=errMsg(error);return}const mo=n=>(n/1048576).toFixed(1)+" Mo";
 $("dvol").innerHTML=`<p>Taille de la base : <b>${mo(data.base_octets)}</b> (à comparer à la limite de votre offre Supabase). Plus grosses tables : ${data.tables.slice(0,5).map(t=>`${esc(t.table)} ${mo(t.octets)}`).join(" · ")}.</p>${PH()&&data.photos_nb!=null?`<p>Photos stockées : <b>${data.photos_nb}</b> fichier(s), <b>${mo(data.photos_octets)}</b> (stockage de fichiers Supabase, à part de la base).</p>`:""}`}
$("ddet").addEventListener("toggle",()=>{if($("ddet").open)renderVol()});
// ===== COPIE CONSULTABLE HORS LIGNE : un ZIP (données + photos + visionneuse), écrit au fil de l'eau =====
class ZipOut{constructor(sink){this.s=sink;this.off=0;this.cen=[];this.enc=new TextEncoder();const d=new Date();this.dt=((d.getFullYear()-1980)<<9)|((d.getMonth()+1)<<5)|d.getDate();this.tm=(d.getHours()<<11)|(d.getMinutes()<<5)|(d.getSeconds()>>1)}
 async w(u){await this.s.write(u);this.off+=u.length}
 async add(name,buf){const nm=this.enc.encode(name),crc=crc32(buf),sz=buf.length;if(sz>=0xFFFFFFFF||this.off>=0xF0000000||this.cen.length>=65000)throw new Error("Copie trop volumineuse pour un seul fichier ZIP");
  const h=new DataView(new ArrayBuffer(30));h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint16(6,0x0800,true);h.setUint16(10,this.tm,true);h.setUint16(12,this.dt,true);h.setUint32(14,crc,true);h.setUint32(18,sz,true);h.setUint32(22,sz,true);h.setUint16(26,nm.length,true);
  const start=this.off;await this.w(new Uint8Array(h.buffer));await this.w(nm);await this.w(buf);this.cen.push({nm,crc,sz,start})}
 async end(){const cs=this.off;for(const e of this.cen){const c=new DataView(new ArrayBuffer(46));c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x0800,true);c.setUint16(12,this.tm,true);c.setUint16(14,this.dt,true);c.setUint32(16,e.crc,true);c.setUint32(20,e.sz,true);c.setUint32(24,e.sz,true);c.setUint16(28,e.nm.length,true);c.setUint32(42,e.start,true);await this.w(new Uint8Array(c.buffer));await this.w(e.nm)}
  const cl=this.off-cs,z=new DataView(new ArrayBuffer(22));z.setUint32(0,0x06054b50,true);z.setUint16(8,this.cen.length,true);z.setUint16(10,this.cen.length,true);z.setUint32(12,cl,true);z.setUint32(16,cs,true);await this.w(new Uint8Array(z.buffer))}}
const LISEZ_LOCAL="STADES 3M – copie consultable hors ligne\r\n\r\nPour consulter cette copie sur votre ordinateur, sans Internet :\r\n 1) extrayez le fichier consulter.html de ce ZIP (ou utilisez celui de l'application) et ouvrez-le avec Chrome, Edge ou Firefox ;\r\n 2) cliquez sur « Ouvrir des sauvegardes » et choisissez ce fichier ZIP (ne l'extrayez pas : la visionneuse le lit directement, photos comprises) ;\r\n 3) recherchez un ticket ou une intervention : fiche complète, suivi, historique et photos.\r\n\r\nCe fichier contient des données personnelles (noms, adresses e-mail) : conservez-le en lieu sûr.\r\n";
async function zipRead(file){const size=file.size,tl=Math.min(size,65557+22),tail=new Uint8Array(await file.slice(size-tl,size).arrayBuffer()),dv=new DataView(tail.buffer);let p=-1;
 for(let i=tail.length-22;i>=0;i--){if(tail[i]===0x50&&tail[i+1]===0x4b&&tail[i+2]===5&&tail[i+3]===6){p=i;break}}
 if(p<0)throw new Error("fichier ZIP illisible");
 const n=dv.getUint16(p+10,true),cds=dv.getUint32(p+12,true),cdo=dv.getUint32(p+16,true);if(n===0xFFFF||cdo===0xFFFFFFFF)throw new Error("archive trop volumineuse");
 const cd=new Uint8Array(await file.slice(cdo,cdo+cds).arrayBuffer()),c=new DataView(cd.buffer),dec=new TextDecoder(),ent=new Map();let o=0;
 while(o+46<=cd.length&&c.getUint32(o,true)===0x02014b50){const nl=c.getUint16(o+28,true),xl=c.getUint16(o+30,true),kl=c.getUint16(o+32,true);ent.set(dec.decode(cd.subarray(o+46,o+46+nl)),{m:c.getUint16(o+10,true),cs:c.getUint32(o+20,true),lo:c.getUint32(o+42,true)});o+=46+nl+xl+kl}
 return{file,ent}}
async function zipBytes(z,name){const e=z.ent.get(name);if(!e)return null;const h=new DataView(await z.file.slice(e.lo,e.lo+30).arrayBuffer()),st=e.lo+30+h.getUint16(26,true)+h.getUint16(28,true),b=z.file.slice(st,st+e.cs);
 if(e.m===0)return new Uint8Array(await b.arrayBuffer());
 if(e.m===8){if(typeof DecompressionStream==="undefined")throw new Error("navigateur trop ancien pour lire un ZIP compressé");return new Uint8Array(await new Response(b.stream().pipeThrough(new DecompressionStream("deflate-raw"))).arrayBuffer())}
 throw new Error("compression non prise en charge")}
/* Fusion de la copie précédente (prev) et de l'état actuel de la base (cur) : sans doublon (clé = id) ; la base prime pour une ligne
   existante, les lignes disparues de la base (purgées) sont conservées. Refuse la fusion si les identifiants ne désignent pas les mêmes objets. */
function mergeCopie(prev,cur){const out={},stat={nouveaux:0,conserves:0},cle={tickets:["ref","created_at"],interventions:["ref","created_at"],plans_preventifs:["created_at"],photos:["chemin"]};
 for(const k of new Set([...Object.keys(prev||{}),...Object.keys(cur)])){const mp=new Map();for(const r of (prev&&prev[k])||[])mp.set(r.id,r);const mc=new Map();for(const r of cur[k]||[])mc.set(r.id,r);
  const f=cle[k];if(f)for(const [id,r] of mc){const o=mp.get(id);if(o&&f.some(c=>o[c]!==undefined&&r[c]!==undefined&&o[c]!==r[c]))throw new Error(`cumul impossible : ${k} n°${id} diffère entre la copie précédente et la base (base différente ou réinitialisée)`)}
  const res=new Map(mp);for(const [id,r] of mc)res.set(id,r);out[k]=[...res.values()];
  if(k==="tickets"||k==="interventions"){for(const id of mc.keys())if(!mp.has(id))stat.nouveaux++;for(const id of mp.keys())if(!mc.has(id))stat.conserves++}}
 return{tables:out,stat}}
async function exportLocal(btn){const m=$("dmsg"),old=btn.textContent;btn.disabled=true;m.style.color="";let w=null,parts=null;
 try{const name=`stades3m_cumul_${today()}.zip`;let sink,prev=null,prevZ=null;
  const pf=$("exprev")&&$("exprev").files[0];
  if(pf){if(!window.showSaveFilePicker)throw new Error("la mise à jour d'une copie existante nécessite Chrome ou Edge");
   prevZ=await zipRead(pf);if(!prevZ.ent.has("donnees.json"))throw new Error("la copie précédente ne contient pas donnees.json");
   prev=JSON.parse(new TextDecoder().decode(await zipBytes(prevZ,"donnees.json")));
   if(prev.application!=="STADES 3M"||!prev.tables)throw new Error("la copie précédente n'est pas une copie STADES 3M");
   if(prev.environnement&&prev.environnement!==ENV)throw new Error(`la copie précédente provient de la base « ${prev.environnement} » : cumul refusé avec la base « ${ENV} »`)}
  if(window.showSaveFilePicker){try{const h=await window.showSaveFilePicker({suggestedName:name,types:[{description:"Archive ZIP",accept:{"application/zip":[".zip"]}}]});w=await h.createWritable();sink={write:u=>w.write(u)}}catch(e){if(e&&e.name==="AbortError"){btn.disabled=false;return}throw e}}
  else{parts=[];sink={write:async u=>{parts.push(u)}}}
  const cur={},names=["sites","zones","categories","corps_etat","entreprises","tickets","ticket_suivi","ticket_events","interventions","intervention_notes","plans_preventifs"];
  for(const t of names){m.textContent="Lecture : "+t+"…";cur[t]=await tbl(t,"id")}
  m.textContent="Lecture : historique des interventions…";cur.audit_log=[];for(let i=0;;i+=1000){const {data,error}=await sb.from("audit_log").select("*").eq("table_name","interventions").order("id").range(i,i+999);if(error)throw error;cur.audit_log=cur.audit_log.concat(data);if(data.length<1000)break}
  cur.photos=PH()?await tbl("photos","id"):[];
  const mg=mergeCopie(prev&&prev.tables,cur),tables=mg.tables,have=new Set(prevZ?[...prevZ.ent.keys()].filter(e=>e.startsWith("photos/")).map(e=>e.slice(7)):[]);
  const aTel=tables.photos.filter(p=>!have.has(p.chemin)&&cur.photos.some(c=>c.id===p.id)),tot=aTel.reduce((a,p)=>a+(p.taille_octets||0),0);
  if(!confirm(`La copie contiendra ${tables.tickets.length} ticket(s), ${tables.interventions.length} intervention(s) et ${tables.photos.length} photo(s).`+(prev?`\n\nPar rapport à la copie précédente : ${mg.stat.nouveaux} nouveau(x) ticket(s)/intervention(s), ${mg.stat.conserves} conservé(s) alors qu'ils ne sont plus en ligne. ${aTel.length} photo(s) à télécharger (environ ${(tot/1048576).toFixed(1)} Mo).`:`\n\nPhotos à télécharger : ${aTel.length} (environ ${(tot/1048576).toFixed(1)} Mo).`)+(parts?"\n\nVotre navigateur garde la copie en mémoire : pour un gros volume, utilisez Chrome ou Edge.":"")+"\n\nContinuer ?")){if(w)await w.abort();btn.disabled=false;m.textContent="";return}
  const zip=new ZipOut(sink),enc=new TextEncoder(),manq=[];let n=0,copiees=0,telech=0;
  for(const p of tables.photos){m.textContent=`Photos ${++n}/${tables.photos.length}…`;
   try{let buf=null;if(have.has(p.chemin)){buf=await zipBytes(prevZ,"photos/"+p.chemin);copiees++}
    else{const r=await sb.storage.from("photos").download(p.chemin);if(r.error||!r.data)throw new Error("absente");buf=new Uint8Array(await r.data.arrayBuffer());telech++}
    await zip.add("photos/"+p.chemin,buf)}catch(_){manq.push(p.chemin)}}
  m.textContent="Écriture des données…";
  const hist=((prev&&prev.copies)||[]).concat([{date:new Date().toISOString(),version:"4.15.0",environnement:ENV,tickets:tables.tickets.length,interventions:tables.interventions.length,photos:tables.photos.length-manq.length,photos_ajoutees:telech,cumul:!!prev}]);
  await zip.add("donnees.json",enc.encode(JSON.stringify({application:"STADES 3M",type:"export-consultable",version:"4.15.0",date:new Date().toISOString(),environnement:ENV,photos_manquantes:manq,copies:hist,tables})));
  try{const r=await fetch("consultation/consulter.html");if(r.ok)await zip.add("consulter.html",new Uint8Array(await r.arrayBuffer()))}catch(_){}
  await zip.add("LISEZ-MOI.txt",enc.encode(LISEZ_LOCAL));await zip.end();if(w){await w.close();w=null}if(parts)dlB(new Blob(parts,{type:"application/zip"}),name);
  m.style.color="var(--ok)";m.textContent=`Copie ${prev?"mise à jour":"créée"} : ${tables.tickets.length} ticket(s), ${tables.interventions.length} intervention(s), ${tables.photos.length-manq.length} photo(s)`+(prev?` (${telech} nouvelle(s), ${copiees} reprise(s) de la copie précédente)`:"")+"."+(manq.length?` ${manq.length} photo(s) introuvable(s) (listées dans le fichier).`:"")+" Conservez ce nouveau ZIP ; l'ancien peut être supprimé une fois vérifié."}
 catch(e){if(w)try{await w.abort()}catch(_){}m.style.color="";m.textContent="Copie impossible : "+errMsg(e)}
 btn.disabled=false;btn.textContent=old}
$("exl").onclick=()=>exportLocal($("exl"));
$("bkp").onclick=async()=>{const m=$("dmsg");m.style.color="";try{const o={application:"STADES 3M",type:"sauvegarde",version:"4.15.0",date:new Date().toISOString(),tables:{}};for(const t of TBX()){m.textContent="Export : "+t+"…";o.tables[t]=await tbl(t,OB[t]||"id")}
 dl(o,`stades3m_sauvegarde_${today()}.json`);m.style.color="var(--ok)";m.textContent="Sauvegarde téléchargée : conservez le fichier en lieu sûr (il contient des données personnelles)."+(PH()?" Les fichiers des photos ne sont pas inclus (seule leur liste l'est) : ils sont dans le stockage Supabase et dans les archives.":"")}catch(e){m.textContent=errMsg(e)}};
let CAND=null;
$("acand").onclick=async()=>{$("dmsg").textContent="";const {data,error}=await sb.rpc("archive_candidats",{p_mois_tickets:+$("amt").value,p_mois_audit:+$("ama").value});if(error){$("dmsg").style.color="";$("dmsg").textContent=errMsg(error);return}
 CAND=data;$("acs").textContent=`${data.tickets_total} ticket(s) et ${data.audit_total} ligne(s) d'audit concernés. Lot proposé : ${data.tickets.length} ticket(s), ${data.interventions.length} intervention(s), ${data.audit.length} ligne(s) d'audit.${PH()&&data.photos_nb!=null?` Photos du lot : ${data.photos_nb} (${(data.photos_octets/1048576).toFixed(1)} Mo).`:""}`;$("apur").classList.toggle("hide",!(data.tickets.length||data.interventions.length||data.audit.length))};
$("apur").onclick=async()=>{const c=CAND,m=$("dmsg");if(!c||!confirm("Télécharger l'archive puis SUPPRIMER DÉFINITIVEMENT ce lot de la base ?"))return;m.style.color="";try{
 const ch=a=>{const r=[];for(let i=0;i<a.length;i+=100)r.push(a.slice(i,i+100));return r},get=async(t,col,ids)=>(await Promise.all(ch(ids).map(x=>sb.from(t).select("*").in(col,x).then(r=>{if(r.error)throw r.error;return r.data})))).flat();
 m.textContent="Préparation de l'archive…";
 const o={application:"STADES 3M",type:"archive",date:new Date().toISOString(),tickets:await get("tickets","id",c.tickets),ticket_suivi:await get("ticket_suivi","ticket_id",c.tickets),ticket_events:await get("ticket_events","ticket_id",c.tickets),interventions:await get("interventions","id",c.interventions),intervention_notes:await get("intervention_notes","intervention_id",c.interventions),audit_log:await get("audit_log","id",c.audit)};
 for(const t of ["sites","zones","categories","corps_etat","entreprises"])o[t]=await tbl(t,"id");
 if(o.tickets.length!==c.tickets.length||o.interventions.length!==c.interventions.length||o.audit_log.length!==c.audit.length)throw new Error("Export incomplet : suppression annulée.");
 if(PH()){const seen=new Set();o.photos=[...await get("photos","ticket_id",c.tickets),...await get("photos","intervention_id",c.interventions)].filter(p=>!seen.has(p.id)&&seen.add(p.id))}
 if(PH()&&o.photos.length){const es=[];let n=0;for(const p of o.photos){m.textContent=`Récupération des photos ${++n}/${o.photos.length}…`;const r=await sb.storage.from("photos").download(p.chemin);if(r.error)throw r.error;es.push({name:"photos/"+p.chemin,buf:new Uint8Array(await r.data.arrayBuffer())})}
  es.unshift({name:"archive.json",buf:new TextEncoder().encode(JSON.stringify(o))});try{const r=await fetch("consultation/consulter.html");if(r.ok)es.push({name:"consulter.html",buf:new Uint8Array(await r.arrayBuffer())})}catch(_){}dlB(zipBlob(es),`stades3m_archive_${today()}.zip`)}
 else dl(o,`stades3m_archive_${today()}.json`);
 const {data,error}=await sb.rpc("archive_purger",{p_tickets:c.tickets,p_interventions:c.interventions,p_audit:c.audit,p_mois_tickets:+$("amt").value,p_mois_audit:+$("ama").value});if(error)throw error;
 CAND=null;$("apur").classList.add("hide");$("acs").textContent="";m.style.color="var(--ok)";m.textContent=`Supprimé : ${data.tickets} ticket(s), ${data.interventions} intervention(s), ${data.audit} ligne(s) d'audit${PH()&&o.photos.length?`, ${o.photos.length} photo(s) (archive au format ZIP : archive.json + dossier photos)`:""}. Relancez la recherche pour le lot suivant.`;await phVider();renderVol();load()}catch(e){m.textContent=errMsg(e)}};

let RF=[],UL=[],UE=null;
const refSel=(x,d)=>`<select class="rf" data-ref="${x.id}" title="Référent par défaut" aria-label="Référent par défaut – ${esc(x.nom)}"><option value="">Référent : règle par défaut</option>${RF.filter(p=>p.role==="admin"||p.role==="responsable").map(p=>`<option value="${p.id}"${p.id===x.referent_id?" selected":""}>${esc((p.prenom+" "+p.nom).trim())}</option>`).join("")}</select>`;
function editU(id){const u=UL.find(x=>x.id===id);if(!u)return;UE=id;$("uem").textContent=u.email||"";["prenom","nom","societe","fonction"].forEach(k=>$("u_"+k).value=u[k]||"");
 $("u_role").innerHTML=O(Object.entries(ROLES),u.role);$("u_site").innerHTML=O([["","— Aucun —"],...sites.filter(x=>x.actif!==false||x.id===u.site_defaut_id).map(x=>[x.id,x.nom])],u.site_defaut_id);$("u_msg").textContent="";$("dUsr").showModal()}
$("u_ko").onclick=()=>$("dUsr").close();
$("u_ok").onclick=async()=>{const v=k=>$("u_"+k).value.trim();if(!v("nom")||!v("prenom")){$("u_msg").textContent="Le nom et le prénom sont obligatoires.";return}
 const {error}=await sb.from("profiles").update({prenom:v("prenom"),nom:v("nom"),societe:v("societe"),fonction:v("fonction"),role:$("u_role").value,site_defaut_id:$("u_site").value?+$("u_site").value:null}).eq("id",UE);
 if(error){$("u_msg").textContent=errMsg(error);return}$("dUsr").close();await load();loadAdmin()};

const VS=[{t:"Bienvenue dans STADES 3M",x:"Cette visite d'une minute présente les boutons principaux. Vous pouvez la passer et la revoir à tout moment avec le lien « Revoir la visite guidée » en bas de page."},
 {s:"new",t:"Nouveau ticket",x:"Signalez un problème ou un besoin : site, zone, catégorie, titre et description. Le ticket reçoit un numéro et une personne est chargée de le traiter."},
 {s:"tabs",t:"Tickets et interventions",x:"Les tickets sont les signalements ; les interventions sont les actions confiées à des agents ou à des entreprises."},
 {s:"newint",t:"Nouvelle intervention",x:"Confiez un travail à des agents ou à une entreprise, avec consignes, échéance et suivi (devis, bon de commande, facture)."},
 {s:"tabp",t:"Maintenance préventive",x:"Les contrôles périodiques (SSI, extincteurs, ascenseurs…) : échéances suivies et interventions créées automatiquement avant la date."},
 {s:"dash",t:"Tableau de bord",x:"Les chiffres clés : tickets par statut, délais de prise en charge, de résolution et de démarrage des interventions."},
 {s:"colt",t:"Colonnes, tri et filtres",x:"Affichez ou masquez des colonnes. Dans les tableaux : cliquez sur le nom d'une colonne pour trier, sur ▾ pour filtrer, sur une ligne pour ouvrir la fiche. Ligne en gras = nouveau, en rouge = urgent."},
 {s:"coli",t:"Colonnes, tri et filtres",x:"Affichez ou masquez des colonnes. Cliquez sur le nom d'une colonne pour trier, sur ▾ pour filtrer, sur une ligne pour ouvrir l'intervention et changer son état."},
 {s:"bell",t:"Notifications",x:"Le compteur indique les nouveautés : ticket attribué, message, changement de statut, intervention. Cliquez sur une notification pour ouvrir l'élément concerné."},
 {s:"sug",t:"Problèmes et suggestions",x:"Signalez un problème, proposez une amélioration ou une nouvelle fonctionnalité à l'administrateur."},
 {s:"hlp",t:"Notice d'utilisation",x:"Ouvre la notice complète de votre profil."},
 {s:"adm",t:"Paramètres",x:"Annuaire des entreprises, corps d'état, sites et zones ; pour l'administrateur : comptes, référents, modèles d'e-mails, journal d'audit, sauvegardes."},
 {s:"tourb",t:"Visite guidée",x:"Relance cette visite à tout moment."},
 {s:"out",t:"Déconnexion",x:"Ferme votre session. Bon travail !"}];
let VL=[],VI=0;
function visite(){VL=VS.filter(x=>!x.s||($(x.s)&&$(x.s).offsetParent));VI=0;showV()}
function showV(){document.querySelectorAll(".tour-hl").forEach(e=>e.classList.remove("tour-hl"));const x=VL[VI];if(!x){$("tour").classList.add("hide");return}
 $("tt").textContent=x.t;$("tx").textContent=x.x;$("tn").textContent=`${VI+1} / ${VL.length}`;$("tp").disabled=VI===0;$("tnx").textContent=VI===VL.length-1?"Terminer":"Suivant";$("tour").classList.remove("hide");
 if(x.s){const e=$(x.s);e.classList.add("tour-hl");e.scrollIntoView({block:"nearest",behavior:"smooth"})}}
$("tnx").onclick=()=>{VI++;showV()};$("tp").onclick=()=>{VI--;showV()};$("tsk").onclick=()=>{VI=VL.length;showV()};$("tourb").onclick=visite;
$("dNew").addEventListener("cancel",e=>e.preventDefault());$("dNew").addEventListener("close",()=>phStageClear("n"));$("dIv").addEventListener("close",()=>{if(!curI||!curI.id)phStageClear("i")});$("dIv").addEventListener("cancel",e=>{if(curI&&!curI.id)e.preventDefault()});
$("ibody").addEventListener("click",e=>{if(e.target.closest("[data-icancel]"))$("dIv").close()});

function colTools(tid,key){const t=$(tid),ths=[...t.querySelectorAll("thead th")],K="adm_"+key;let st={};try{st=JSON.parse(localStorage.getItem(K)||"{}")}catch(e){}st.w=st.w||{};st.h=st.h||[];
 const sty=document.createElement("style");document.head.appendChild(sty);
 const apply=()=>{sty.textContent=`#${tid}{table-layout:fixed;width:100%}`+ths.map((_,i)=>{const n=i+1;let r="";if(st.w[i])r+=`#${tid} th:nth-child(${n}){width:${st.w[i]}px}`;if(st.h.includes(i))r+=`#${tid} th:nth-child(${n}),#${tid} td:nth-child(${n}){display:none}`;return r}).join("");try{localStorage.setItem(K,JSON.stringify(st))}catch(e){}};
 const lab=ths.map(th=>th.textContent.trim()||"Actions");
 ths.forEach((th,i)=>{th.style.position="relative";const g=document.createElement("span");g.className="rz";g.title="Glisser pour modifier la largeur";g.onmousedown=e=>{e.preventDefault();const x0=e.clientX,w0=th.offsetWidth,mv=ev=>{st.w[i]=Math.max(50,w0+ev.clientX-x0);apply()},up=()=>{document.removeEventListener("mousemove",mv);document.removeEventListener("mouseup",up)};document.addEventListener("mousemove",mv);document.addEventListener("mouseup",up)};th.appendChild(g)});
 const b=document.createElement("button");b.className="sec sm";b.textContent="Colonnes";b.style.margin="0 0 0 auto";const pop=document.createElement("div");pop.className="panel hide";pop.style.cssText="margin:0 0 8px;padding:8px 12px";
 const fill=()=>{pop.innerHTML=lab.map((l,i)=>`<label style="display:inline-block;margin-right:14px"><input type="checkbox" data-c="${i}"${st.h.includes(i)?"":" checked"}> ${esc(l)}</label>`).join("")+`<button class="sec" data-r style="margin-left:6px">Réinitialiser</button>`};fill();
 pop.onchange=e=>{const i=+e.target.dataset.c;st.h=st.h.filter(x=>x!==i);if(!e.target.checked)st.h.push(i);apply()};
 pop.onclick=e=>{if(e.target.dataset.r!==undefined){st={w:{},h:[]};fill();apply()}};
 b.onclick=e=>{e.preventDefault();e.stopPropagation();pop.classList.toggle("hide")};const w=t.closest(".table")||t,sm=t.closest("details")&&t.closest("details").querySelector(":scope>summary");if(sm)sm.appendChild(b);else w.parentNode.insertBefore(b,w);w.parentNode.insertBefore(pop,w);apply()}
colTools("dtab","dem");colTools("utab","usr");colTools("atab","aud");
const ADM_KEY=`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`,ADM_BACK=`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>`;
let NEV=false;$("unev").onclick=()=>{NEV=!NEV;loadAdmin()};
$("dS").addEventListener("cancel",e=>e.preventDefault());

// ===== MAINTENANCE PRÉVENTIVE =====
let PL=[],PE=null,PLM=[];
/* Locaux déjà connus du site (tickets, interventions, plans) : proposés au fil de la saisie */
function localFill(sid){const m=new Map();for(const x of [...tk,...ints,...PL]){if(!x.local||String(x.site_id)!==String(sid))continue;const v=x.local.trim().replace(/\s+/g," "),k=v.toLowerCase();if(!v)continue;if(!m.has(k))m.set(k,new Map());m.get(k).set(v,(m.get(k).get(v)||0)+1)}
 /* une seule graphie par local : la plus utilisée, à égalité celle qui n'est pas tout en minuscules */
 const best=g=>[...g.entries()].sort((a,b)=>b[1]-a[1]||((b[0]!==b[0].toLowerCase())-(a[0]!==a[0].toLowerCase())))[0][0];
 $("dlLocal").innerHTML=[...m.values()].map(best).sort((a,b)=>a.localeCompare(b,"fr",{numeric:true,sensitivity:"base"})).map(v=>`<option value="${esc(v)}"></option>`).join("")}
document.addEventListener("focusin",e=>{const t=e.target;if(!t.getAttribute||t.getAttribute("list")!=="dlLocal")return;
 const sid=t.id==="nl"?$("ns").value:t.id==="pl_l"?$("pl_s").value:t.closest("#ibody")?(curI&&curI.site_id):t.closest("#tbody")?(cur&&cur.site_id):null;localFill(sid)});
const PM={1:"1 mois",2:"2 mois",3:"3 mois",4:"4 mois",6:"6 mois",12:"1 an",24:"2 ans",36:"3 ans",48:"4 ans",60:"5 ans"},canPl=()=>["admin","responsable"].includes(role());
function stPl(p){const d=today();if(!p.actif)return["pause","En pause"];if(p.prochaine_echeance<d)return["retard","En retard"];const l=new Date(p.prochaine_echeance+"T00:00:00");l.setDate(l.getDate()-p.prevenance_jours);return l.toLocaleDateString("sv-SE")<=d?["venir","À venir"]:["jour","À jour"]}
function renderPl(){const r=role(),inAdm=!$("ad").classList.contains("hide"),ok=["admin","responsable","supervision"].includes(r);
 $("tabp").classList.toggle("hide",!ok);$("tabp").classList.toggle("sec",tab!=="p");$("pv").classList.toggle("hide",inAdm||tab!=="p"||!ok);
 $("newpl").classList.toggle("hide",tab!=="p"||!canPl());$("bulkpl").classList.toggle("hide",tab!=="p"||!canPl());$("genpl").classList.toggle("hide",tab!=="p"||!canPl());$("colp").classList.toggle("hide",tab!=="p"||!ok||inAdm);if(tab!=="p"||!ok)return;
 const f=$("pvf").value;TB.p.base=PL.filter(p=>!f||stPl(p)[0]===f);head("p");
 const rows=sortFilt(TB.p.base,"p"),ro=canPl()?"":" ro";
 $("prows").innerHTML=rows.map(p=>rowH("p",p,(stPl(p)[0]==="pause"?"pl-row-off":"")+ro,`data-pl="${p.id}"`)).join("")||`<tr><td colspan="${visCols("p").length}" class="empty">Aucun plan de maintenance.</td></tr>`}
function openPl(p){PE=p?p.id:null;const v=p||{site_id:me.site_defaut_id&&sites.some(x=>x.id===me.site_defaut_id)?me.site_defaut_id:(sites.find(x=>x.actif!==false)||{}).id,categorie_id:(cats[0]||{}).id,periodicite_mois:12,prevenance_jours:30,priorite:"normale",actif:true,agent_ids:[]};
 $("dPlT").textContent=p?"Modifier le plan":"Nouveau plan de maintenance";$("pl_ti").value=v.titre||"";$("pl_ty").value=v.type_plan||"";$("pl_s").innerHTML=sOpts();$("pl_s").value=v.site_id;$("pl_z").innerHTML=tOpts(v.site_id);if(v.zone_id)$("pl_z").value=v.zone_id;$("pl_l").value=v.local||"";
 $("pl_c").innerHTML=catsO(v.categorie_id);$("pl_k").innerHTML='<option value="">— Aucun —</option>'+corpsO(v.categorie_id,v.corps_etat_id);$("pl_tx").value=v.consignes||"";$("pl_m").innerHTML=O(Object.entries(PM),v.periodicite_mois);$("pl_d").value=v.prochaine_echeance||"";$("pl_j").value=v.prevenance_jours;$("pl_p").innerHTML=prioO(v.priorite);
 $("pl_x").checked=v.actif===false;$("dPl").classList.toggle("pl-off",$("pl_x").checked);$("pl_msg").textContent="";$("dPl").showModal()}
// ===== PLANS EN SÉRIE (à partir du catalogue des contrôles) =====
let BPD="";
function openBp(){$("bp_s").innerHTML=sOpts();const dv=me.site_defaut_id&&sites.some(x=>x.id===me.site_defaut_id)?me.site_defaut_id:(sites.find(x=>x.actif!==false)||{}).id;$("bp_s").value=dv;BPD="";$("bp_d").value="";$("bp_m").textContent="";bpSite();$("dBp").showModal()}
function bpSite(){$("bp_z").innerHTML=tOpts($("bp_s").value);bpRows()}
function bpCount(){const n=$("bp_l").querySelectorAll(".bprow.on").length;$("bp_n").textContent=n?`${n} contrôle(s) coché(s)`:""}
function bpRows(){const sid=+$("bp_s").value,M=PLM.filter(m=>m.actif!==false);
 if(!M.length){$("bp_l").innerHTML=`<p class="empty">Le catalogue est vide ou inactif. L'administrateur le complète dans Paramètres › Catalogue des contrôles de maintenance préventive.</p>`;bpCount();return}
 $("bp_l").innerHTML=`<div class="bph"><span>Contrôle</span><span>Corps d'état</span><span>Périodicité</span><span>Prochaine échéance</span><span>Prévenance (j)</span></div>`+M.map(m=>{
  const dup=PL.some(p=>p.site_id===sid&&String(p.titre).trim().toLowerCase()===String(m.titre).trim().toLowerCase());
  return `<div class="bprow" data-m="${m.id}"><label class="ck"><input type="checkbox" data-bk="on"> <b>${esc(m.titre)}</b>${dup?' <span class="tag" title="Un plan de même nom existe déjà pour ce site">déjà planifié</span>':""}</label>
  <select data-bk="corps" aria-label="Corps d'état"><option value="">— Aucun —</option>${corpsO(m.categorie_id,m.corps_etat_id)}</select>
  <select data-bk="per" aria-label="Périodicité">${O(Object.entries(PM),m.periodicite_mois)}</select>
  <input type="date" data-bk="d" value="${BPD}" aria-label="Prochaine échéance"><input type="number" data-bk="prev" min="0" max="365" value="${m.prevenance_jours}" aria-label="Prévenance en jours"></div>`}).join("");bpCount()}
$("bulkpl").onclick=openBp;$("bp_s").onchange=bpSite;$("bp_ko").onclick=()=>$("dBp").close();
$("bp_d").onchange=()=>{const n=$("bp_d").value;$("bp_l").querySelectorAll('[data-bk="d"]').forEach(i=>{if(!i.value||i.value===BPD)i.value=n});BPD=n};
$("bp_l").onchange=e=>{const t=e.target;if(t.dataset.bk==="on")t.closest(".bprow").classList.toggle("on",t.checked);bpCount()};
$("bp_all").onclick=()=>{$("bp_l").querySelectorAll('[data-bk="on"]').forEach(i=>{i.checked=true;i.closest(".bprow").classList.add("on")});bpCount()};
$("bp_none").onclick=()=>{$("bp_l").querySelectorAll('[data-bk="on"]').forEach(i=>{i.checked=false;i.closest(".bprow").classList.remove("on")});bpCount()};
$("bp_ok").onclick=async()=>{const m=$("bp_m"),sid=+$("bp_s").value,zid=+$("bp_z").value;m.style.color="";
 if(!$("bp_t").value){m.textContent="Choisissez le type : contrôle périodique ou maintenance.";$("bp_t").focus();return}
 if(!sid||!zid){m.textContent="Choisissez un site et une zone.";return}
 const rows=[],dups=[];
 for(const el of $("bp_l").querySelectorAll(".bprow.on")){const md=PLM.find(x=>x.id==el.dataset.m),q=k=>el.querySelector(`[data-bk="${k}"]`).value;
  if(!q("d")){m.textContent=`Indiquez la prochaine échéance de « ${md.titre} ».`;return}
  const pj=+q("prev");if(!(pj>=0&&pj<=365)){m.textContent=`La prévenance de « ${md.titre} » doit être comprise entre 0 et 365 jours.`;return}
  rows.push({titre:md.titre,type_plan:$("bp_t").value,site_id:sid,zone_id:zid,local:null,categorie_id:md.categorie_id,corps_etat_id:q("corps")?+q("corps"):null,consignes:md.consignes||null,priorite:"normale",periodicite_mois:+q("per"),prochaine_echeance:q("d"),prevenance_jours:pj,entreprise_id:null,agent_ids:[],actif:true});
  if(el.querySelector(".tag"))dups.push(md.titre)}
 if(!rows.length){m.textContent="Cochez au moins un contrôle.";return}
 if(dups.length&&!confirm("Ces contrôles existent déjà pour ce site :\n- "+dups.join("\n- ")+"\n\nLes créer quand même ?"))return;
 $("bp_ok").disabled=true;const {error}=await sb.from("plans_preventifs").insert(rows);$("bp_ok").disabled=false;
 if(error){m.textContent="Création impossible : "+errMsg(error);return}
 $("dBp").close();await load();alert(rows.length+" plan(s) de maintenance créé(s).")};
// ===== CATALOGUE DES CONTRÔLES (Paramètres, administrateur) =====
function renderPM(){const el=$("pmods");if(!el)return;
 el.innerHTML=PLM.map(m=>`<tr data-m="${m.id}"><td><input data-mf="titre" value="${esc(m.titre)}" aria-label="Contrôle"></td><td><select data-mf="categorie_id" aria-label="Catégorie">${catsO(m.categorie_id)}</select></td>
 <td><select data-mf="corps_etat_id" aria-label="Corps d'état par défaut"><option value="">— Aucun —</option>${corpsO(m.categorie_id,m.corps_etat_id)}</select></td>
 <td><select data-mf="periodicite_mois" aria-label="Périodicité par défaut">${O(Object.entries(PM),m.periodicite_mois)}</select></td>
 <td><input type="number" data-mf="prevenance_jours" min="0" max="365" value="${m.prevenance_jours}" aria-label="Prévenance (jours)"></td>
 <td><input data-mf="consignes" value="${esc(m.consignes||"")}" aria-label="Consignes"></td>
 <td><input type="checkbox" data-mf="actif"${m.actif!==false?" checked":""} aria-label="Actif"></td>
 <td><button class="sec ic" data-md="${m.id}" title="Supprimer" aria-label="Supprimer">${TRASH}</button></td></tr>`).join("")||`<tr><td colspan="8" class="empty">Catalogue vide.</td></tr>`}
$("pm_add").onclick=async()=>{const m=$("pm_msg"),t=$("pm_t").value.trim();m.style.color="";if(!t){m.textContent="Saisissez le nom du contrôle.";return}if(!cats.length){m.textContent="Aucune catégorie définie.";return}
 const {data,error}=await sb.from("plans_modeles").insert({titre:t,categorie_id:cats[0].id,corps_etat_id:null,periodicite_mois:12,prevenance_jours:30,actif:true}).select().single();
 if(error){m.textContent=/duplicate|unique/i.test(error.message||"")?"Ce contrôle existe déjà dans le catalogue.":errMsg(error);return}
 PLM.push(data);PLM.sort((a,b)=>a.titre.localeCompare(b.titre,"fr"));$("pm_t").value="";m.style.color="var(--ok)";m.textContent="Contrôle ajouté : complétez sa catégorie, son corps d'état et sa périodicité.";renderPM()};
$("pmods").onchange=async e=>{const t=e.target,tr=t.closest("tr[data-m]"),f=t.dataset.mf;if(!tr||!f)return;const id=+tr.dataset.m,md=PLM.find(x=>x.id===id),m=$("pm_msg");m.style.color="";
 let v=t.type==="checkbox"?t.checked:t.value;
 if(f==="titre"){v=v.trim();if(!v){m.textContent="Le nom du contrôle est obligatoire.";renderPM();return}}
 if(["categorie_id","corps_etat_id","periodicite_mois"].includes(f))v=v===""?null:+v;
 if(f==="prevenance_jours"){v=Math.round(+v);if(!(v>=0&&v<=365)){m.textContent="La prévenance doit être comprise entre 0 et 365 jours.";renderPM();return}}
 if(f==="consignes")v=v.trim()||null;
 const u={[f]:v};if(f==="categorie_id")u.corps_etat_id=null;
 const {error}=await sb.from("plans_modeles").update(u).eq("id",id);
 if(error){m.textContent=/duplicate|unique/i.test(error.message||"")?"Ce nom existe déjà dans le catalogue.":"Enregistrement impossible : "+errMsg(error);renderPM();return}
 Object.assign(md,u);m.style.color="var(--ok)";m.textContent="Enregistré.";if(f==="categorie_id")renderPM()};
$("pmods").onclick=async e=>{const b=e.target.closest("[data-md]");if(!b)return;const md=PLM.find(x=>x.id==b.dataset.md);if(!md||!confirm(`Supprimer « ${md.titre} » du catalogue ? Les plans déjà créés ne sont pas touchés.`))return;
 const {error}=await sb.from("plans_modeles").delete().eq("id",md.id);if(error){$("pm_msg").textContent=errMsg(error);return}PLM=PLM.filter(x=>x.id!==md.id);renderPM()};
$("pvf").onchange=renderPl;$("newpl").onclick=()=>openPl(null);
$("genpl").onclick=async()=>{const {data,error}=await sb.rpc("preventif_generer");if(error){alert(errMsg(error));return}alert(data+" intervention(s) créée(s) pour les contrôles dont l'échéance approche.");await load()};
$("prows").onclick=async e=>{const b=e.target.closest("button");if(!b){const tr=e.target.closest("tr[data-pl]");if(tr&&canPl())openPl(PL.find(x=>x.id==tr.dataset.pl));return}if(b.dataset.pe)openPl(PL.find(x=>x.id==b.dataset.pe));else if(b.dataset.pd&&confirm("Supprimer ce plan ? Les interventions déjà créées sont conservées.")){const {error}=await sb.from("plans_preventifs").delete().eq("id",b.dataset.pd);if(error)alert(errMsg(error));await load()}};
$("pl_s").onchange=()=>{$("pl_z").innerHTML=tOpts($("pl_s").value)};
$("pl_c").onchange=()=>{$("pl_k").innerHTML='<option value="">— Aucun —</option>'+corpsO($("pl_c").value)};
$("pl_ko").onclick=()=>$("dPl").close();$("pl_x").onchange=()=>$("dPl").classList.toggle("pl-off",$("pl_x").checked);$("dPl").addEventListener("cancel",e=>e.preventDefault());
$("pl_ok").onclick=async()=>{const g=id=>$(id).value;
 if(!g("pl_ty")){$("pl_msg").textContent="Choisissez le type : contrôle périodique ou maintenance.";$("pl_ty").focus();return}
 if(!g("pl_ti").trim()||!g("pl_s")||!g("pl_z")||!g("pl_c")||!g("pl_d")){$("pl_msg").textContent="Contrôle, site, zone, catégorie et prochaine échéance sont obligatoires.";return}
 const row={titre:g("pl_ti").trim(),type_plan:g("pl_ty"),site_id:+g("pl_s"),zone_id:+g("pl_z"),local:g("pl_l").trim()||null,categorie_id:+g("pl_c"),corps_etat_id:g("pl_k")?+g("pl_k"):null,consignes:g("pl_tx").trim()||null,periodicite_mois:+g("pl_m"),prochaine_echeance:g("pl_d"),prevenance_jours:+g("pl_j")||0,priorite:g("pl_p"),entreprise_id:null,agent_ids:[],actif:!$("pl_x").checked};
 const {error}=PE?await sb.from("plans_preventifs").update(row).eq("id",PE):await sb.from("plans_preventifs").insert(row);if(error){$("pl_msg").textContent=errMsg(error);return}$("dPl").close();await load()};
appliquerEnv();
$("lt").onclick=()=>{ENV=ENV==="test"?"prod":"test";sb=supabase.createClient(ENVS[ENV].url,ENVS[ENV].key);appliquerEnv();$("lmsg").textContent=""}; // lien invisible : bascule prod <-> test sans perdre la saisie
$("login").addEventListener("keydown",e=>{if(e.key==="Enter"&&e.target.tagName==="INPUT"&&e.target.type!=="checkbox"){e.preventDefault();$("go").click()}});
async function start(){
 const {data}=await sb.auth.getSession(); if(!data.session)return;if(INVITE)$("dPw").showModal();
 const p=await sb.from("profiles").select("*").eq("id",data.session.user.id).single(); me=p.data;if(p.error||!me){alert((p.error&&/permission denied|schema cache/i.test(p.error.message||"")?"Accès refusé à la base de données : les droits d'accès aux tables ne sont pas configurés (exécuter migration_droits_api.sql). ":"")+"Profil introuvable : contactez l'administrateur.");await sb.auth.signOut();return}
 $("login").classList.add("hide");$("app").classList.remove("hide");$("hd").classList.remove("hide");
 $("who").textContent=`${me.prenom||""} ${me.nom||""} · ${ROLES[me.role]}`;
 $("vas").classList.toggle("hide",me.role!=="admin");$("vasbar").classList.toggle("hide",me.role!=="admin");$("adm").classList.toggle("hide",!["admin","responsable"].includes(me.role));document.body.classList.toggle("nadm",me.role!=="admin");
 if(!me.actif){$("pending").classList.remove("hide");return}const first=!me.premiere_connexion_at;sb.rpc("marquer_connexion").then(()=>{});
 await load();loadNot();live();phInit();if(first)setTimeout(visite,600);
}
$("vas").onchange=()=>{view=$("vas").value;$("ad").classList.add("hide");render()};
$("adm").onclick=()=>{$("ad").classList.toggle("hide");render();if(!$("ad").classList.contains("hide"))loadAdmin()};

async function load(){
 const [s,t,k]=await Promise.all([sb.from("sites").select("*").order("nom"),sb.from("zones").select("*").order("nom"),allRows("tickets")]);
 if(s.error||t.error||k.error){alert("Erreur de chargement : "+(s.error||t.error||k.error).message);return}
 sites=s.data;zoneL=t.data;tk=k.data;
 const [c1,c2]=await Promise.all([sb.from("categories").select("*").order("id"),sb.from("corps_etat").select("*").order("id")]);
 if(c1.error||c2.error){alert("Erreur de chargement : "+errMsg(c1.error||c2.error));return}cats=c1.data||[];corps=(c2.data||[]).sort((a,b)=>a.nom.localeCompare(b.nom,"fr"));
 const [iv,ag]=await Promise.all([allRows("interventions"),sb.from("profiles").select("id,prenom,nom,role,email").in("role",["agent_travaux","agent_exploitation","responsable","admin"]).eq("actif",true)]);
 if(iv.error||ag.error){alert("Erreur de chargement : "+errMsg(iv.error||ag.error));return}ints=iv.data||[];agents=ag.data||[];const en=await sb.from("entreprises").select("*").order("entreprise");ents=en.data||[];{const mm=await sb.from("modeles_mail").select("*");MM=Object.fromEntries((mm.data||[]).map(m=>[m.cle,m]))}{const pp=await sb.from("plans_preventifs").select("*").order("prochaine_echeance");PL=pp.data||[]}if(["admin","responsable"].includes(me.role)){const pm=await sb.from("plans_modeles").select("*").order("titre");PLM=pm.error?[]:(pm.data||[])}$("ncat").innerHTML=catOpts();$("ncorps").innerHTML=corpsOpts($("ncat").value);
 
 $("ns").innerHTML=sOpts();$("nt2").innerHTML=tOpts($("ns").value);
 render();
}

$("ns").onchange=()=>$("nt2").innerHTML=tOpts($("ns").value);

function render(){
 const r=role(),isAgent=r.startsWith("agent");
 renderCp();
 const inAdm=!$("ad").classList.contains("hide");renderIv();renderPl();$("tk").classList.toggle("hide",inAdm||tab!=="t");$("iv").classList.toggle("hide",inAdm||tab!=="i");$("adm").innerHTML=inAdm?ADM_BACK:ADM_KEY;$("adm").title=$("adm").ariaLabel=inAdm?"Retour aux tickets":"Paramètres";
 $("tkA").classList.toggle("hide",isAgent);$("tkC").classList.toggle("hide",isAgent);$("agentmsg").classList.toggle("hide",!isAgent);
 const baseL=tk.filter(x=>canSee(x,r));TB.t.base=baseL;const list=sortFilt(baseL,"t");
 const act=list.filter(x=>!done(x)),clo=list.filter(done);
 $("tkA").innerHTML=tkGroups(act,"Aucun ticket ne correspond à ces filtres.",3);
 $("clh").textContent=`Tickets clos – résolus, refusés, archivés (${clo.length})`;$("clh").classList.toggle("hide",!clo.length);
 $("tkC").innerHTML=tkGroups(clo,"",4)}


$("new").onclick=()=>{$("fNew").reset();$("np").value="normale";if(me.site_defaut_id&&sites.some(x=>x.id===me.site_defaut_id))$("ns").value=me.site_defaut_id;$("nt2").innerHTML=tOpts($("ns").value);$("ncorps").innerHTML=corpsOpts($("ncat").value);$("nmsg").textContent="";$("nphz").classList.toggle("hide",!PH());phStageClear("n");$("dNew").showModal()};
$("fNew").onsubmit=async e=>{e.preventDefault();
 if(!$("ns").value||!$("nt2").value){$("nmsg").textContent="Site et zone sont obligatoires.";return}
 if(!$("ncorps").value){$("nmsg").textContent="Le corps d'état est obligatoire : choisissez-en un avant d'enregistrer le ticket.";$("ncorps").focus();return}
 const {data:nv,error}=await sb.from("tickets").insert({site_id:$("ns").value,zone_id:$("nt2").value,local:$("nl").value||null,titre:$("nt").value,description:$("nd").value,priorite:$("np").value,sensible:$("ns2").checked,categorie_id:$("ncat").value,corps_etat_id:$("ncorps").value}).select("id").single();
 if(error){$("nmsg").textContent="Enregistrement impossible : "+errMsg(error);return}
 if(PH()&&PHST.n.length){const r=await phStageSend("n","ticket_id",nv.id,$("nmsg"));if(r.bad.length)alert("Le ticket est créé, mais des photos n'ont pas pu être ajoutées :\n"+r.bad.join("\n")+"\nVous pourrez les ajouter depuis la fiche du ticket.")}
 phStageClear("n");$("dNew").close();load()};

async function loadAdmin(){
 renderPM();
 const dc=await sb.from("demandes_compte").select("*").order("created_at",{ascending:false});
 const pr=await sb.from("profiles").select("email,premiere_connexion_at");
 const pm=Object.fromEntries((pr.data||[]).map(u=>[(u.email||"").toLowerCase(),u]));
 const cpt=d=>{if(d.statut==="refusee")return "—";const u=pm[d.email.toLowerCase()];return !u?`<span class="off">Pas de compte</span>`:u.premiere_connexion_at?`<span class="on">Connecté (${new Date(u.premiere_connexion_at).toLocaleDateString("fr-FR")})</span>`:`<span class="s-en_attente">Compte créé, jamais connecté</span>`};
 $("drows").innerHTML=(dc.data||[]).map(d=>{const a=d.statut==="en_attente";return `<tr><td>${esc(d.prenom)} ${esc(d.nom)}</td><td>${esc(d.societe)} – ${esc(d.fonction)}</td><td>${esc(d.email)}</td><td>${cpt(d)}</td>
  <td>${a?`<select data-d="${d.id}" aria-label="Rôle à attribuer"><option value="">— Choisir un rôle —</option>${opts(ROLES)}</select>`:(d.statut==="approuvee"?"Approuvée : "+ROLES[d.role_prevu]:"Refusée")}</td>
  <td>${a?`<button data-d="${d.id}" data-a="approuvee" data-e="${esc(d.email)}">Approuver</button> <button class="sec" data-d="${d.id}" data-a="refusee">Refuser</button>`:""} <button class="sec ic" data-d="${d.id}" data-a="suppr" title="Supprimer cette demande" aria-label="Supprimer cette demande">${TRASH}</button></td></tr>`}).join("")||`<tr><td colspan="6" class="empty">Aucune demande de compte.</td></tr>`;
 const {data}=await sb.from("profiles").select("*").order("created_at",{ascending:false});
 const cxr=await sb.rpc("connexions_30j"),cx=cxr.data||{};UL=data||[];$("unev").textContent=(NEV?"Masquer":"Afficher")+" les comptes jamais connectés ("+(data||[]).filter(u=>!u.premiere_connexion_at).length+")";$("urows").innerHTML=(data||[]).filter(u=>NEV||u.premiere_connexion_at).map(u=>`<tr><td>${esc(u.prenom)} ${esc(u.nom)}</td><td>${esc(u.societe)} – ${esc(u.fonction)}</td><td>${esc(u.email)}</td>
  <td><select data-u="${u.id}" data-f="role">${opts(ROLES)}</select></td><td><select data-u="${u.id}" data-f="site_defaut_id" aria-label="Site par défaut">${O([["","— Aucun —"],...sites.map(x=>[x.id,x.nom])],u.site_defaut_id)}</select></td>
  <td>${u.derniere_connexion?tlTime(u.derniere_connexion):"—"}</td><td>${cxr.error?"—":(cx[u.id]||0)}</td>
  <td><button class="sec ic" data-u="${u.id}" data-e="1" title="Éditer" aria-label="Éditer">✎</button> <button class="${u.actif?"st-on":"st-off"}" data-u="${u.id}" data-f="actif" data-v="${!u.actif}" title="${u.actif?"Cliquer pour désactiver ce compte":"Cliquer pour activer ce compte"}">${u.actif?"Actif":"Inactif"}</button></td></tr>`).join("");
 (data||[]).forEach(u=>{const s=document.querySelector(`select[data-u="${u.id}"]`);if(s)s.value=u.role});
 renderAnn();renderGrids();renderMM();renderAff();
}
async function adm(p){const {error}=await p;$("amsg").textContent=error?"Action impossible : "+errMsg(error):"";if(error)alert("Action impossible : "+errMsg(error));await load();loadAdmin()}
$("urows").onchange=e=>{const t=e.target,f=t.dataset.f==="site_defaut_id"?"site_defaut_id":"role";adm(sb.from("profiles").update({[f]:f==="role"?t.value:(t.value?+t.value:null)}).eq("id",t.dataset.u))};
$("urows").onclick=e=>{const b=e.target.closest("button");if(b&&b.dataset.e)editU(b.dataset.u);else if(b)adm(sb.from("profiles").update({actif:b.dataset.v==="true"}).eq("id",b.dataset.u))};
$("asb").onclick=()=>{if($("as").value.trim()){adm(sb.from("sites").insert({nom:$("as").value.trim()}));$("as").value=""}};
$("drows").onclick=async e=>{const b=e.target.closest("button");if(!b)return;
 if(b.dataset.a==="suppr"){if(!confirm("Supprimer cette demande ? Le compte éventuellement déjà créé n'est pas touché."))return;
  const {error}=await sb.from("demandes_compte").delete().eq("id",b.dataset.d);
  $("cmsg").style.color=error?"":"var(--ok)";$("cmsg").textContent=error?"Suppression impossible : "+errMsg(error):"Demande supprimée.";loadAdmin();return}
 const sel=document.querySelector(`select[data-d="${b.dataset.d}"]`);
 if(b.dataset.a==="approuvee"&&!sel.value){$("cmsg").style.color="";$("cmsg").textContent="Attribuez d'abord un rôle à cette personne avant d'approuver sa demande.";sel.style.outline="2px solid var(--bad)";sel.onchange=()=>{sel.style.outline=""};sel.scrollIntoView({block:"center"});sel.focus();alert("Choisissez d'abord le rôle de cette personne, puis cliquez sur Approuver.");return}
 const {error}=await sb.from("demandes_compte").update({statut:b.dataset.a,role_prevu:sel.value||"demandeur"}).eq("id",b.dataset.d);
 $("cmsg").style.color=error?"":"var(--ok)";
 $("cmsg").textContent=error?"Action impossible : "+errMsg(error):(b.dataset.a==="approuvee"?`Demande approuvée. Invitez maintenant ${b.dataset.e} dans Supabase (Authentication > Users > Invite user).`:"Demande refusée.");
 loadAdmin()};
$("pwok").onclick=async()=>{if($("np1").value.length<12){$("pmsg").textContent="12 caractères minimum.";return}
 const {error}=await sb.auth.updateUser({password:$("np1").value});
 if(error){$("pmsg").textContent="Enregistrement impossible : "+errMsg(error);return}
 $("dPw").close();history.replaceState(null,"",location.pathname)};
const TB={t:{f:{},s:{k:null,d:1},base:[]},i:{f:{},s:{k:null,d:1},base:[]},p:{f:{},s:{k:"pro",d:1},base:[]}};
const ts=d=>d?+new Date(d):0,mk=(l,v)=>({l,v,k:x=>String(v(x)).toLowerCase()});
const catLab=x=>x.categorie_id?`${(cats.find(c=>c.id===x.categorie_id)||{}).nom||"?"} / ${(corps.find(c=>c.id===x.corps_etat_id)||{}).nom||"—"}`:"—";
const refK=(x,o)=>{const [a,b,c]=x.ref.split("-").slice(o).map(Number);return a*1e8+b*1e6+c};
const prenom=n=>(n||"").trim().split(/\s+/)[0]||"—";
const corpsN=x=>(corps.find(c=>c.id===x.corps_etat_id)||{}).nom||"—";
const COLS={
 ref:{l:"N°",c:"nw rf",lock:1,v:x=>x.ref,k:x=>refK(x,0)},
 sens:{l:"Sensible",c:"nw",v:x=>x.sensible?"Oui":"—",k:x=>x.sensible?1:0,h:x=>x.sensible?'<span class="tag" style="background:var(--bad);color:#fff;border-color:var(--bad)">Sensible</span>':"—"},
 priorite:{l:"Priorité",c:"nw",v:x=>PR[x.priorite],k:x=>["urgente","haute","normale","basse"].indexOf(x.priorite),h:x=>`<span class="tag p-${x.priorite}">${PR[x.priorite]}</span>`},
 statut:{l:"Statut",c:"nw",v:x=>ST[x.statut],k:x=>Object.keys(ST).indexOf(x.statut),h:x=>`<span class="tag s-${x.statut}">${ST[x.statut]}</span>`},
 site:{...mk("Site",x=>siteN(x.site_id)),c:"lc"},zone:{...mk("Zone",x=>zoneN(x.zone_id)),c:"lc"},local:{...mk("Local",x=>x.local||"—"),c:"lc"},
 titre:{...mk("Ticket",x=>x.titre),c:"tt",lock:1},
 corps:{...mk("Corps d'état",corpsN),c:"lc"},
 charge:{...mk("En charge",x=>prenom(x.en_charge_nom)),c:"nw"},
 fin:{l:"Fin prévue",c:"nw",v:x=>x.fin_prevue?fdate(x.fin_prevue):"—",k:x=>ts(x.fin_prevue)},
 par:{...mk("Demandeur",x=>prenom(x.demandeur_nom)),c:"nw"},
 date:{l:"Créé le",c:"nw",v:x=>new Date(x.created_at).toLocaleDateString("fr-FR"),k:x=>ts(x.created_at)}};
const np=x=>!x.echeance&&!["terminee","annulee"].includes(x.etat);
const attV=x=>{const en=ents.find(e=>e.id===x.entreprise_id);return [x.agents_noms,en?eLab(en):x.prestataire].filter(Boolean).join(" · ")||"—"};
const entV=x=>{const en=ents.find(e=>e.id===x.entreprise_id);return en?en.entreprise:(x.prestataire||"—")};
const ICOLS={
 ref:{l:"N°",c:"nw rf",lock:1,v:x=>x.ref,k:x=>refK(x,1)},
 titre:{...mk("Intervention",x=>x.titre),c:"tt",lock:1},
 etat:{l:"État",c:"nw",v:x=>ET[x.etat],k:x=>Object.keys(ET).indexOf(x.etat),h:x=>`<span class="tag">${ET[x.etat]}</span>`},
 site:{...mk("Site",x=>siteN(x.site_id)),c:"lc"},zone:{...mk("Zone",x=>zoneN(x.zone_id)),c:"lc"},local:{...mk("Local",x=>x.local||"—"),c:"lc"},
 corps:{...mk("Corps d'état",corpsN),c:"lc"},
 fin:{l:"Date d'intervention",c:"nw",v:x=>x.echeance?fdate(x.echeance):(np(x)?"À planifier":"—"),k:x=>ts(x.echeance),h:x=>x.echeance?esc(fdate(x.echeance)):(np(x)?'<span class="tag t-np">À planifier</span>':"—")},
 duree:{l:"Durée",c:"nw",v:x=>fduree(x.duree_j),k:x=>+x.duree_j||0},
 ent:{...mk("Entreprise",entV),c:"lc"},
 resp:{...mk("Responsable",x=>prenom(x.responsable_nom)),c:"nw"}};
Object.entries({ref:92,sens:85,priorite:95,statut:105,site:120,zone:105,local:105,titre:230,corps:120,charge:100,fin:100,par:95,date:95}).forEach(([k,w])=>COLS[k].w=w);
Object.entries({ref:110,titre:230,etat:110,site:120,zone:105,local:105,corps:120,fin:150,duree:75,ent:140,resp:95}).forEach(([k,w])=>ICOLS[k].w=w);
const TPL={controle_periodique:"Contrôle périodique",maintenance:"Maintenance"};
const PCOLS={
 titre:{...mk("Contrôle",p=>p.titre),c:"tt",lock:1,h:p=>`<b>${esc(p.titre)}</b>`},
 type:{...mk("Type",p=>TPL[p.type_plan]||"—"),c:"nw"},
 site:{...mk("Site",p=>siteN(p.site_id)),c:"lc"},zone:{...mk("Zone",p=>zoneN(p.zone_id)),c:"lc"},local:{...mk("Local",p=>p.local||"—"),c:"lc"},
 cat:{...mk("Catégorie",p=>(cats.find(c=>c.id===p.categorie_id)||{}).nom||"—"),c:"lc"},
 corps:{...mk("Corps d'état",p=>(corps.find(c=>c.id===p.corps_etat_id)||{}).nom||"—"),c:"lc"},
 per:{l:"Périodicité",c:"nw",v:p=>PM[p.periodicite_mois]||p.periodicite_mois+" mois",k:p=>p.periodicite_mois},
 der:{l:"Dernière réalisation",c:"nw",v:p=>p.derniere_realisation?fdate(p.derniere_realisation):"—",k:p=>ts(p.derniere_realisation)},
 pro:{l:"Prochaine échéance",c:"nw",v:p=>fdate(p.prochaine_echeance),k:p=>ts(p.prochaine_echeance)},
 st:{l:"Statut",c:"nw",v:p=>stPl(p)[1],k:p=>["retard","venir","jour","pause"].indexOf(stPl(p)[0]),h:p=>{const s=stPl(p);return `<span class="pst ${s[0]}">${s[1]}</span>`}},
 act:{l:"",c:"nw ac",lock:1,nof:1,v:()=>"",k:()=>0,h:p=>canPl()?`<button class="sec ic" data-pe="${p.id}" title="Modifier" aria-label="Modifier">✎</button> <button class="sec ic" data-pd="${p.id}" title="Supprimer" aria-label="Supprimer">${TRASH}</button>`:""}};
Object.entries({titre:250,type:150,site:120,zone:110,local:110,cat:130,corps:130,per:110,der:140,pro:140,st:110,act:100}).forEach(([k,w])=>PCOLS[k].w=w);
const CB={t:COLS,i:ICOLS,p:PCOLS},redraw=tb=>tb==="t"?render():tb==="p"?renderPl():tb==="c"?renderCp():renderIv();
const done=x=>["resolue","refusee","archivee"].includes(x.statut);
const rowCls=x=>(x.statut==="nouvelle"?"new ":"")+(x.priorite==="urgente"&&!done(x)?"urg ":"")+(["resolue","refusee"].includes(x.statut)?"res":x.statut==="archivee"?"arc":"");
function sortFilt(l,tb){const T=TB[tb],C=CB[tb];l=l.filter(x=>Object.entries(T.f).every(([k,s])=>s.has(C[k].v(x))));
 if(!T.s.k)return l;const f=C[T.s.k].k;return [...l].sort((a,b)=>((f(a)>f(b))-(f(a)<f(b)))*T.s.d)}
const VIS={},vkey=tb=>`colvis:${tb}:${me.id}`;
const visOf=tb=>VIS[tb]||(VIS[tb]=(()=>{try{return JSON.parse(localStorage.getItem(vkey(tb)))||{}}catch(e){return{}}})());
const saveVis=tb=>{try{localStorage.setItem(vkey(tb),JSON.stringify(VIS[tb]))}catch(e){}};
const WID={},wkey=tb=>`colw:${tb}:${me.id}`;
const wOf=tb=>WID[tb]||(WID[tb]=(()=>{try{return JSON.parse(localStorage.getItem(wkey(tb)))||{}}catch(e){return{}}})());
const saveW=tb=>{try{localStorage.setItem(wkey(tb),JSON.stringify(WID[tb]))}catch(e){}};
const visCols=tb=>Object.entries(CB[tb]).filter(([k,c])=>c.lock||!visOf(tb)[k]);
const tw=tb=>visCols(tb).reduce((a,[k,c])=>a+(wOf(tb)[k]||c.w||120),0);
const colsHtml=tb=>visCols(tb).map(([k,c])=>`<col data-tb="${tb}" data-k="${k}" style="width:${wOf(tb)[k]||c.w||120}px">`).join("");
const thHtml=tb=>{const T=TB[tb];return visCols(tb).map(([k,c])=>c.nof?`<th></th>`:`<th aria-sort="${T.s.k===k?(T.s.d>0?"ascending":"descending"):"none"}"><button class="hb" data-s="${k}">${c.l}${T.s.k===k?(T.s.d>0?" ▲":" ▼"):""}</button><button class="hf${T.f[k]?" on":""}" data-f="${k}" aria-label="Filtrer la colonne ${c.l}">${T.f[k]?"⧩":"▾"}</button><span class="rs" data-tb="${tb}" data-r="${k}" title="Glisser pour ajuster la largeur"></span></th>`).join("")};
const rowH=(tb,x,cls,attr)=>`<tr class="c ${cls}" ${attr}>${visCols(tb).map(([k,c])=>`<td class="${c.c||""}" data-k="${k}"${c.h?"":` title="${esc(c.v(x))}"`}>${c.h?c.h(x):esc(c.v(x))}</td>`).join("")}</tr>`;
function head(tb){if(tb==="p"){$("phr").innerHTML=thHtml("p");$("pcg").innerHTML=colsHtml("p");$("ptab").style.width=tw("p")+"px"}if(tb==="i"){$("ihr").innerHTML=thHtml("i");$("ihr2").innerHTML=thHtml("i");$("icg").innerHTML=$("icg2").innerHTML=colsHtml("i");document.querySelectorAll('table[data-tb="i"]').forEach(t=>t.style.width=tw("i")+"px")}}
const hdClick=tb=>e=>{const b=e.target.closest("button");if(!b)return;const T=TB[tb];
 if(b.dataset.s){T.s=T.s.k===b.dataset.s?{k:T.s.k,d:-T.s.d}:{k:b.dataset.s,d:1};redraw(tb)}else openPop(tb,b.dataset.f,b)};
$("ihr").onclick=$("ihr2").onclick=hdClick("i");$("phr").onclick=hdClick("p");
const catGroups=()=>[...cats.filter(c=>c.domaine==="exploitation"),...cats.filter(c=>c.domaine==="batiments"),...cats.filter(c=>c.domaine!=="exploitation"&&c.domaine!=="batiments"),{id:null,nom:"Sans catégorie"}];
function tkGroups(list,msg,lvl){const o=catGroups().map(g=>{const l=list.filter(x=>(x.categorie_id||null)===g.id);if(!l.length)return"";
 return `<h${lvl} class="gh">${esc(g.nom)} <small>(${l.length})</small></h${lvl}><div class="table"><table class="rt" data-tb="t" style="width:${tw("t")}px"><colgroup>${colsHtml("t")}</colgroup><thead><tr>${thHtml("t")}</tr></thead><tbody>${l.map(x=>rowH("t",x,rowCls(x),`data-id="${x.id}"`)).join("")}</tbody></table></div>`}).join("");
 return o||(msg?`<p class="empty">${msg}</p>`:"")}
const tkClick=e=>{if(e.target.closest("button.hb,button.hf"))return hdClick("t")(e);const tr=e.target.closest("tr.c");if(tr)openDet(+tr.dataset.id)};
$("tkA").onclick=$("tkC").onclick=tkClick;
let cpTb=null;
function openCols(tb,btn){const p=$("cpop");if(!p.classList.contains("hide")&&cpTb===tb){p.classList.add("hide");return}
 cpTb=tb;const V=visOf(tb);p.innerHTML=`<b style="font-size:13px">Colonnes affichées</b>`+Object.entries(CB[tb]).filter(([k,c])=>!c.nof).map(([k,c])=>`<label class="ck"><input type="checkbox" data-c="${k}"${!V[k]||c.lock?" checked":""}${c.lock?" disabled":""}> ${esc(c.l)}</label>`).join("")+`<button class="sec pb" data-all>Tout afficher</button><button class="sec pb" data-rw>Réinitialiser les largeurs</button>`;
 const r=btn.getBoundingClientRect();p.style.top=(r.bottom+scrollY+4)+"px";p.style.left=Math.max(8,Math.min(r.left+scrollX,innerWidth-275))+"px";p.classList.remove("hide")}
$("cpop").onchange=e=>{const k=e.target.dataset.c;if(!k)return;const V=visOf(cpTb);if(e.target.checked)delete V[k];else{V[k]=true;delete TB[cpTb].f[k]}saveVis(cpTb);redraw(cpTb)};
$("cpop").onclick=e=>{if(e.target.closest("[data-rw]")){WID[cpTb]={};saveW(cpTb);redraw(cpTb);return}if(!e.target.closest("[data-all]"))return;const V=visOf(cpTb);Object.keys(V).forEach(k=>delete V[k]);saveVis(cpTb);document.querySelectorAll("#cpop [data-c]").forEach(b=>b.checked=true);redraw(cpTb)};
$("colt").onclick=e=>openCols("t",e.currentTarget);$("coli").onclick=e=>openCols("i",e.currentTarget);$("colp").onclick=e=>openCols("p",e.currentTarget);
function setW(tb,k,w){wOf(tb)[k]=w;document.querySelectorAll(`col[data-tb="${tb}"][data-k="${k}"]`).forEach(c=>c.style.width=w+"px");document.querySelectorAll(`table[data-tb="${tb}"]`).forEach(t=>t.style.width=tw(tb)+"px")}
document.addEventListener("pointerdown",e=>{const h=e.target.closest(".rs");if(!h)return;e.preventDefault();
 const tb=h.dataset.tb,k=h.dataset.r,x0=e.clientX,w0=h.parentElement.getBoundingClientRect().width;
 const mv=ev=>setW(tb,k,Math.max(60,Math.round(w0+ev.clientX-x0))),up=()=>{document.removeEventListener("pointermove",mv);document.removeEventListener("pointerup",up);saveW(tb)};
 document.addEventListener("pointermove",mv);document.addEventListener("pointerup",up)});
function openPop(tb,k,btn){const T=TB[tb],C=CB[tb],c=C[k],o=T.base.filter(x=>Object.entries(T.f).every(([j,s])=>j===k||s.has(C[j].v(x)))).sort((a,b)=>(c.k(a)>c.k(b))-(c.k(a)<c.k(b)));
 const vals=[...new Set(o.map(c.v))],cur=T.f[k]||new Set(vals),p=$("pop");p.dataset.k=k;p.dataset.tb=tb;
 p.innerHTML=`<button class="sec pb" data-o="asc">Trier du plus petit au plus grand (A → Z)</button><button class="sec pb" data-o="desc">Trier du plus grand au plus petit (Z → A)</button>
 <input id="pq" placeholder="Rechercher" aria-label="Rechercher dans les valeurs">
 <label class="ck"><input type="checkbox" id="pall"${vals.every(v=>cur.has(v))?" checked":""}> (Tout sélectionner)</label>
 <div id="pl">${vals.map(v=>`<label class="ck"><input type="checkbox" data-v="${esc(v)}"${cur.has(v)?" checked":""}> ${esc(v)}</label>`).join("")}</div>
 <button class="sec pb" data-o="clear">Effacer le filtre de cette colonne</button>`;
 const r=btn.getBoundingClientRect();p.style.top=(r.bottom+scrollY+4)+"px";p.style.left=Math.max(8,Math.min(r.left+scrollX,innerWidth-275))+"px";p.classList.remove("hide")}
$("pop").onclick=e=>{const b=e.target.closest("button");if(!b)return;const tb=$("pop").dataset.tb,k=$("pop").dataset.k,T=TB[tb];
 if(b.dataset.o==="clear")delete T.f[k];else T.s={k,d:b.dataset.o==="asc"?1:-1};$("pop").classList.add("hide");redraw(tb)};
$("pop").onchange=e=>{const tb=$("pop").dataset.tb,k=$("pop").dataset.k,T=TB[tb],bx=[...document.querySelectorAll("#pl input")];
 if(e.target.id==="pall")bx.forEach(b=>b.checked=e.target.checked);
 if(bx.every(b=>b.checked))delete T.f[k];else T.f[k]=new Set(bx.filter(b=>b.checked).map(b=>b.dataset.v));
 $("pall").checked=bx.every(b=>b.checked);redraw(tb)};
$("pop").oninput=e=>{if(e.target.id!=="pq")return;const q=e.target.value.toLowerCase();
 document.querySelectorAll("#pl label").forEach(l=>l.classList.toggle("hide",!l.textContent.toLowerCase().includes(q)))};
document.addEventListener("click",e=>{if(!e.target.closest("#pop,.hf"))$("pop").classList.add("hide");if(!e.target.closest("#cpop,#colt,#coli,#colp,#colc"))$("cpop").classList.add("hide")});
const isResp=r=>r==="responsable";
const dom=r=>({agent_travaux:"batiments",agent_exploitation:"exploitation"})[r];
const catDom=x=>(cats.find(c=>c.id===x.categorie_id)||{}).domaine;
const peutEditer=(x,r)=>r==="admin"||isResp(r);
const canSee=(x,r)=>peutEditer(x,r)||r==="supervision"||(["demandeur","responsable"].includes(r)&&x.demandeur_id===me.id&&x.statut!=="archivee");
let cats=[],corps=[];
const ET={a_planifier:"À planifier",planifiee:"Planifiée",en_attente_pieces:"En attente de pièces",en_cours:"En cours",terminee:"Terminée",annulee:"Annulée"};
const FINANCES=false;   // passer à true pour réactiver le suivi financier (devis, bon de commande, factures, montants)
const SU=[["devis_demande_at","Devis demandé","d"],["devis_recu_at","Devis reçu","d"],["bc_numero","N° de bon de commande (12 caractères min.)","t"],["bc_envoye_at","Bon de commande envoyé","d"],["facture_recue","Facture reçue","n"],["facture_payee","Facture payée","n"],["montant_devis_ht","Devis HT (€)","m"],["montant_bc_ht","Bon de commande HT (€)","m"],["montant_facture_ht","Facture HT (€)","m"]];
const eur=v=>Number(v).toLocaleString("fr-FR",{style:"currency",currency:"EUR"});
const NPO=[["non","Non"],["partiel","Partiel"],["oui","Oui"]];
const suIn=(k,l,t,c)=>`<div style="flex:1 1 45%"><label>${l}</label>${t==="d"?`<input type="date" data-f="${k}" value="${c[k]||""}">`:t==="m"?`<input type="number" min="0" step="0.01" data-f="${k}" value="${c[k]??""}">`:t==="t"?`<input data-f="${k}" value="${esc(c[k]||"")}">`:`<select data-f="${k}">${O(NPO,c[k]||"non")}</select>`}</div>`;
const suVw=(k,l,t,c)=>t==="d"?(c[k]?`✔ ${l} (${fdate(c[k])})`:`○ ${l}`):t==="m"?`${l} : ${c[k]!=null&&c[k]!==""?eur(c[k]):"—"}`:t==="t"?(c[k]?`✔ BC n° ${esc(c[k])}`:"○ N° de bon de commande"):`${l} : ${(NPO.find(x=>x[0]===(c[k]||"non"))||[])[1]}`;
function fmtTel(v){if(!v)return"";const s=String(v).trim(),d=s.replace(/\D/g,"");let m=d.match(/^(?:0033|33)0?(\d{9})$/);
 if(m)return"+33 "+m[1][0]+" "+m[1].slice(1).replace(/(\d{2})(?=\d)/g,"$1 ");m=d.match(/^0(\d{9})$/);
 if(m)return"0"+m[1][0]+" "+m[1].slice(1).replace(/(\d{2})(?=\d)/g,"$1 ");
 return(s[0]==="+"?"+":"")+d.replace(/(\d{2})(?=\d)/g,"$1 ")}
const eLab=e=>e.entreprise+(e.contact?" – "+e.contact:"");
function entOpts(c){const inC=ents.filter(e=>!(e.categorie_ids||[]).length||(e.categorie_ids||[]).includes(c.categorie_id)),m=c.corps_etat_id?inC.filter(e=>e.corps_etat_id===c.corps_etat_id):[],o=inC.filter(e=>!m.includes(e)),
 op=(e,b)=>`<option value="${e.id}"${e.id===c.entreprise_id?" selected":""}${b?' style="font-weight:bold"':""}>${esc(eLab(e))}</option>`;
 return (m.length?`<optgroup label="Corps d'état : ${esc((corps.find(x=>x.id===c.corps_etat_id)||{}).nom||"")}">${m.map(e=>op(e,1)).join("")}</optgroup>`:"")+(o.length?`<optgroup label="${m.length?"Autres entreprises de la catégorie":"Entreprises de la catégorie"}">${o.map(e=>op(e)).join("")}</optgroup>`:"")}
const dv=()=>!FINANCES?"":`<label class="ck"><input type="checkbox" data-dv${devisMail?" checked":""}> Inclure une demande de devis dans le mail</label>`;
let ints=[],agents=[],ents=[],curI=null,pendingTicket=null,tab="t",ed=false,imode="a",devisMail=false;
const fdate=d=>d?new Date(d).toLocaleDateString("fr-FR"):"—",nm=()=>`${me.prenom} ${me.nom}`,isAg=()=>role().startsWith("agent"),today=()=>new Date().toLocaleDateString("sv-SE");
const fduree=j=>{if(j==null||j==="")return"—";return (+j).toLocaleString("fr-FR",{maximumFractionDigits:2})+" j"};
const O=(a,v)=>a.map(([k,l])=>`<option value="${k}"${String(k)===String(v)?" selected":""}>${esc(l)}</option>`).join("");
const sitesO=v=>O(sites.map(x=>[x.id,x.nom]),v),zoneO=(sid,v)=>O(zoneL.filter(t=>t.site_id==sid).map(t=>[t.id,t.nom]),v),catsO=(v,mine)=>O(cats.map(c=>[c.id,c.nom]),v),corpsO=(cid,v)=>O(corps.filter(x=>x.actif!==false&&x.categorie_id==cid).map(x=>[x.id,x.nom]),v),prioO=v=>O(Object.entries(PR),v);
const tlTime=d=>new Date(d).toLocaleString("fr-FR",{dateStyle:"short",timeStyle:"short"});
function askYN(t,x){return new Promise(res=>{const d=$("dYN");let r=false;$("ynt").textContent=t;$("ynx").textContent=x||"";$("yny").onclick=()=>{r=true;d.close()};$("ynn").onclick=()=>d.close();d.onclose=()=>res(r);d.showModal()})}
function askJust(t,wp){return new Promise(res=>{const d=$("dJ");$("jt").textContent=t;$("jx").value="";$("jm").textContent="";$("jphf").value="";$("jph").classList.toggle("hide",!wp);d.onclose=()=>res(null);$("jno").onclick=()=>d.close();
 $("jok").onclick=()=>{const v=$("jx").value.trim();if(!v){$("jm").textContent="La justification est obligatoire.";return}res(wp?{j:v,files:[...$("jphf").files]}:v);d.onclose=null;d.close()};d.showModal()})}
function norm(t){const f=t.dataset.f;let v=t.value===""?null:t.value;if(f.endsWith("_id")&&f!=="en_charge_id"&&f!=="responsable_id"&&v!==null)v=+v;if(f==="duree_j"&&v!==null)v=Math.round(parseFloat(String(v).replace(",","."))*100)/100;if(t.type==="checkbox")v=t.checked;const u={[f]:v};
 if(f==="site_id")u.zone_id=(zoneL.find(x=>x.site_id===v)||{}).id||null;
 if(f==="categorie_id")u.corps_etat_id=(corps.find(x=>x.categorie_id===v)||{}).id||null;return u}
const baseF=(c,mine)=>`<div class="row"><div><label>Site</label><select data-f="site_id">${sitesO(c.site_id)}</select></div><div><label>Zone</label><select data-f="zone_id">${zoneO(c.site_id,c.zone_id)}</select></div></div>
<label>Local</label><input data-f="local" list="dlLocal" autocomplete="off" value="${esc(c.local||"")}">
<div class="row"><div><label>Catégorie</label><select data-f="categorie_id">${catsO(c.categorie_id,mine)}</select></div><div><label>Corps d'état</label><select data-f="corps_etat_id">${corpsO(c.categorie_id,c.corps_etat_id)}</select></div></div>
<label>Titre</label><input data-f="titre" value="${esc(c.titre)}">`;
const respO=c=>O(agents.filter(a=>a.role==="admin"||isResp(a.role)).map(a=>[a.id,`${((a.prenom||"")+" "+(a.nom||"")).trim()} (${ROLES[a.role]})`]),c.responsable_id);
const respN=c=>c.responsable_nom||(()=>{const a=agents.find(x=>x.id===c.responsable_id);return a?((a.prenom||"")+" "+(a.nom||"")).trim():""})()||"non désigné";
const chargeO=c=>{const d=catDom(c);return O([...agents.filter(a=>a.role==="admin"||isResp(a.role)).map(a=>[a.id,`${((a.prenom||"")+" "+(a.nom||"")).trim()} (${ROLES[a.role]})`])],c.en_charge_id)};
const hdr=c=>`<div class="dh"><div><h2>${esc(siteN(c.site_id))}</h2><div class="sub">${esc(zoneN(c.zone_id))}${c.local?" · "+esc(c.local):""}</div></div>`;
// ===== TICKET =====
const canT=()=>peutEditer(cur,role()),canF=()=>canT()||(cur.demandeur_id===me.id&&cur.statut==="nouvelle"&&["demandeur","responsable"].includes(role()));
function openDet(id){cur=tk.find(x=>x.id===id);ed=false;drawT();$("dDet").showModal()}
function drawT(){const c=cur,E=ed&&canF(),cn=canT();
 $("tbody").innerHTML=`${hdr(c)}<div class="dhb">${canF()?`<button class="ic" data-edit title="Modifier" aria-label="Modifier">✎</button>`:""}${XCL}</div></div>
 <p class="big"><b>${c.ref}</b> – ${esc(c.titre)}</p><div class="desc">${esc(c.description||"Aucune description.")}</div>${PH()?'<div id="phz"></div>':""}
 ${E?`<div class="ep">${baseF(c)}<label>Description</label><textarea data-f="description" rows="3">${esc(c.description||"")}</textarea><label>Priorité</label><select data-f="priorite">${prioO(c.priorite)}</select><label class="ck"><input type="checkbox" data-f="sensible"${c.sensible?" checked":""}> Ticket sensible</label>${cn?`<label>En charge</label><select data-f="en_charge_id">${chargeO(c)}</select>`:""}</div>`:""}
 <p class="meta">${esc(catLab(c))} · demandé par ${esc(c.demandeur_nom||"—")} le ${fdate(c.created_at)} · Priorité ${PR[c.priorite]}${c.sensible?' · <span class="tag" style="background:var(--bad);color:#fff;border-color:var(--bad)">Sensible</span>':""}</p>
 <p><span class="tag s-${c.statut}">${ST[c.statut]}</span>${c.fin_prevue?` &nbsp;Fin d'intervention prévue : <b>${fdate(c.fin_prevue)}</b>`:""}</p>
 ${c.en_charge_nom||cn?`<p>En charge : <b>${esc(c.en_charge_nom||"personne pour l'instant")}</b>${cn&&c.en_charge_id!==me.id?` <button class="sec" data-me>Me l'attribuer</button>`:""}</p>`:""}
 ${cn?`<div class="btns">${Object.entries(ST).filter(([k])=>k!==c.statut).map(([k,v])=>`<button class="sec" data-st="${k}">${v}</button>`).join("")}</div>`:""}
 <h3>Historique</h3><div id="tl"></div>${!cn&&c.demandeur_id===me.id?`<textarea id="nt1" rows="2" placeholder="Écrire un message à l'équipe" aria-label="Message à l'équipe" style="margin-top:8px"></textarea><button data-note style="margin-top:6px">Envoyer le message</button>`:""}
 ${cn?`<textarea id="nt1" rows="2" placeholder="Ajouter une note" aria-label="Nouvelle note" style="margin-top:8px"></textarea><label class="ck" style="margin-top:6px"><input type="checkbox" id="nti" checked> Note interne (invisible du demandeur)</label><button data-note style="margin-top:6px">Ajouter la note</button>
 <h3>Interventions</h3>${ints.filter(x=>x.ticket_id===c.id).map(i=>`<div class="tl"><a class="lnk" data-i="${i.id}">${esc(i.ref)}</a> – ${esc(i.titre)} (${ET[i.etat]})</div>`).join("")||`<p class="empty" style="padding:8px">Aucune intervention.</p>`}
 <button class="sec" data-newint>Créer une intervention depuis ce ticket</button>`:""}${role()==="supervision"?`<h3>Interventions</h3>${ints.filter(x=>x.ticket_id===c.id).map(i=>`<div class="tl"><a class="lnk" data-i="${i.id}">${esc(i.ref)}</a> – ${esc(i.titre)} (${ET[i.etat]})</div>`).join("")||`<p class="empty" style="padding:8px">Aucune intervention.</p>`}`:""}`;$("tbody").insertAdjacentHTML("beforeend",XFOOT);loadTl();phRender("t",c,E)}
async function loadTl(){const cn=canT()||role()==="supervision";
 const [e,n]=await Promise.all([cn?sb.from("ticket_events").select("*").eq("ticket_id",cur.id):{data:[]},sb.from("ticket_suivi").select("*").eq("ticket_id",cur.id)]);
 const L=[...(e.data||[]).map(v=>({d:v.created_at,a:v.par_nom,t:v.type==="creation"?"Ticket créé":v.type==="modif"?`Modifié – ${v.ancien} : ${v.nouveau}`:`Statut : ${ST[v.ancien]||"—"} → ${ST[v.nouveau]||v.nouveau}`})),
  ...(n.data||[]).filter(x=>!(cn&&x.message.startsWith("Statut changé"))).map(x=>({d:x.created_at,a:x.auteur,t:x.message,n:1,i:x.interne}))].sort((a,b)=>new Date(a.d)-new Date(b.d));
 $("tl").innerHTML=L.map(x=>`<div class="tl${x.n?" nt":""}"><span>${tlTime(x.d)}</span>${x.a?"<b>"+esc(x.a)+"</b> : ":""}${x.i?'<span class="tag">interne</span> ':""}${esc(x.t)}</div>`).join("")||`<p class="empty" style="padding:8px">Aucun historique.</p>`}
async function reloadT(){await load();const n=tk.find(x=>x.id===cur.id);
 if(!n){$("dDet").close();alert("Le ticket a été transféré vers l'autre catégorie : il n'apparaît plus dans votre liste.");return}cur=n;drawT()}
async function setSt(k){let j=null;if(k==="resolue"||k==="refusee"){j=await askJust((k==="refusee"?"Refus du ticket ":"Clôture du ticket ")+cur.ref);if(!j)return}
 if(k==="en_attente"){const r=await askJust("Mise en attente du ticket "+cur.ref+" – raison de l'attente");if(!r)return;j="Mise en attente : "+r}
 const {error}=await sb.rpc("ticket_changer_statut",{p_id:cur.id,p_statut:k,p_justif:j});if(error){alert("Modification impossible : "+errMsg(error));return}reloadT()}
$("tbody").onchange=async e=>{if(!e.target.dataset.f)return;const u=norm(e.target);if(u.titre===null){alert("Le titre est obligatoire.");drawT();return}
 const {error}=await sb.from("tickets").update(u).eq("id",cur.id);if(error){alert("Modification impossible : "+errMsg(error));drawT();return}reloadT()};
$("tbody").onclick=async e=>{const b=e.target.closest("[data-edit],[data-st],[data-note],[data-newint],[data-i],[data-me]");if(!b)return;const d=b.dataset;
 if("edit" in d){ed=!ed;drawT()}else if("me" in d){const {error}=await sb.from("tickets").update({en_charge_id:me.id}).eq("id",cur.id);if(error)alert("Modification impossible : "+errMsg(error));else reloadT()}else if(d.st)setSt(d.st)
 else if("note" in d){const m=$("nt1").value.trim();if(!m)return;const {error}=await sb.from("ticket_suivi").insert({ticket_id:cur.id,auteur:nm(),message:m,interne:$("nti")?$("nti").checked:false});if(error)alert(errMsg(error));else loadTl();$("nt1").value=""}
 else if("newint" in d){$("dDet").close();pendingTicket=cur;openIv(null,cur)}
 else if(d.i){$("dDet").close();pendingTicket=null;openIv(ints.find(x=>x.id==d.i))}};
// ===== INTERVENTIONS =====
function renderIv(){const r=role(),ag=isAg(),edt=r!=="demandeur"&&!ag;
 if(ag)tab="i";if(r==="demandeur")tab="t";
 const inAdm=!$("ad").classList.contains("hide");$("tabs").classList.toggle("hide",inAdm);
 $("tabt").classList.toggle("hide",ag||r==="demandeur");$("tabi").classList.toggle("hide",r==="demandeur");
 $("tabt").classList.toggle("sec",tab!=="t");$("tabi").classList.toggle("sec",tab!=="i");
 $("new").classList.toggle("hide",tab!=="t"||ag||r==="supervision");$("colt").classList.toggle("hide",tab!=="t"||ag);$("dash").classList.toggle("hide",!edt);$("newint").classList.toggle("hide",tab!=="i"||!edt||r==="supervision");$("coli").classList.toggle("hide",tab!=="i");
 const base=ints.filter(i=>ag?(i.agent_ids||[]).includes(me.id):(peutEditer(i,r)||r==="supervision"));TB.i.base=base;
 const l=sortFilt(base,"i"),cl=i=>["terminee","annulee"].includes(i.etat),ope=l.filter(i=>!cl(i)),act=[...ope.filter(np),...ope.filter(i=>!np(i))],clo=l.filter(cl);head("i");
 $("iempty").classList.toggle("hide",act.length>0);$("iempty2").classList.toggle("hide",clo.length>0);$("ich").textContent=`Interventions closes – terminées, annulées (${clo.length})`;
 const row=i=>rowH("i",i,i.etat==="terminee"?"res":i.etat==="annulee"?"arc":np(i)?"np":"",`data-i="${i.id}"`);
 $("irows").innerHTML=act.map(row).join("");$("irows2").innerHTML=clo.map(row).join("")}
$("tabt").onclick=()=>{tab="t";render()};$("tabi").onclick=()=>{tab="i";render()};$("tabp").onclick=()=>{tab="p";render()};
$("newint").onclick=()=>{pendingTicket=null;openIv(null,null)};
$("irows").onclick=e=>{const tr=e.target.closest("tr");if(tr){pendingTicket=null;openIv(ints.find(x=>x.id==tr.dataset.i))}};
function openIv(i,t){if(!i)phStageClear("i");const v=i?{...i}:{site_id:t?t.site_id:((sites.find(x=>x.id===me.site_defaut_id)||sites[0])||{}).id,zone_id:t?t.zone_id:null,local:t?t.local:null,categorie_id:t?t.categorie_id:((isResp(role())&&cats.find(x=>x.domaine===dom(role())))||cats[0]||{}).id,corps_etat_id:t?t.corps_etat_id:null,
 titre:t?t.titre:"",consignes:t&&t.description||"",priorite:t?t.priorite:"normale",etat:"a_planifier",agent_ids:[],echeance:null,duree_j:null,responsable_id:me.id};
 if(!i&&!v.zone_id)v.zone_id=(zoneL.find(x=>x.site_id===v.site_id)||{}).id;if(!i&&!v.corps_etat_id)v.corps_etat_id=(corps.find(x=>x.categorie_id===v.categorie_id)||{}).id||null;
 curI=v;ed=false;imode=v.entreprise_id?"e":"a";devisMail=false;drawI();if(!$("dIv").open)$("dIv").showModal()}
function planCard(c,quick){const miss=!c.echeance&&!["terminee","annulee"].includes(c.etat);
 const d=c.echeance?`<span class="pv2">${esc(fdate(c.echeance))}</span>`:(quick?`<input type="date" data-f="echeance" aria-label="Date d'intervention"> <span class="tag t-np">À planifier</span>`:(miss?`<span class="tag t-np">À planifier</span>`:`<span class="meta">non précisée</span>`));
 const u=c.duree_j?`<span class="pv2">${esc(fduree(c.duree_j))}</span>`:(quick?`<input type="number" class="dur" data-f="duree_j" min="0.25" max="365" step="0.25" inputmode="decimal" placeholder="jours" aria-label="Durée en jours"> <small>j</small>`:`<span class="meta">non précisée</span>`);
 return `<div class="plan${miss?" np":""}"><div><span class="pl">Date d'intervention</span>${d}</div><div><span class="pl">Durée</span>${u}</div></div>`}
function drawI(){const c=curI,saved=!!c.id,r=role(),ag=isAg(),canE=!ag&&r!=="demandeur"&&(!saved||peutEditer(c,r)),E=canE&&(ed||!saved),mine=ag&&(c.agent_ids||[]).includes(me.id);
 const mode=c.entreprise_id?"e":imode,ent=ents.find(x=>x.id===c.entreprise_id),t=c.ticket_id&&tk.find(x=>x.id===c.ticket_id),cd=catDom(c);
 const ce=corps.find(x=>x.id===c.corps_etat_id),allE=!ce||ce.nom==="Tous corps d'état";
 $("ibody").innerHTML=`${hdr(c)}<div class="dhb">${canE&&saved?`<button class="ic" data-edit title="Modifier" aria-label="Modifier">✎</button>`:""}${XCL}</div></div>
 <p class="big"><b>${saved?c.ref:"Nouvelle intervention"}</b> – ${esc(c.titre||"")}</p><div class="desc">${esc(c.consignes||"Aucune consigne.")}</div>${c.ticket_id&&PH()?'<div id="phzt"></div>':""}${saved&&PH()?'<div id="phz"></div>':""}
 ${E?`<div class="ep">${baseF(c,1)}<label>Consignes</label><textarea data-f="consignes" rows="3">${esc(c.consignes||"")}</textarea>
  <div class="row"><div><label>Priorité</label><select data-f="priorite">${prioO(c.priorite)}</select></div><div><label>Date d'intervention</label><input type="date" data-f="echeance" value="${c.echeance||""}"></div><div><label>Durée (jours, par quart de journée)</label><input type="number" data-f="duree_j" min="0.25" max="365" step="0.25" inputmode="decimal" placeholder="ex. 0,5" value="${c.duree_j??""}"></div></div>
  <label>Responsable de l'intervention</label><select data-f="responsable_id"><option value="">— Aucun —</option>${respO(c)}</select>
  <label>Intervenants</label><select data-f="mode">${O([["a","Agents / responsables"],["e","Entreprise"]],mode)}</select>
  ${mode==="a"?agents.filter(a=>a.role==="responsable"||!cd||dom(a.role)===cd).map(a=>`<label class="ck"><input type="checkbox" data-agent="${a.id}" data-n="${esc(((a.prenom||"")+" "+(a.nom||"")).trim())}"${(c.agent_ids||[]).includes(a.id)?" checked":""}> ${esc(a.prenom||"")} ${esc(a.nom||"")} <small>(${ROLES[a.role]})</small></label>`).join("")||`<span class="empty" style="padding:4px">Aucun agent actif dans ce domaine.</span>`
  :`<label>Interlocuteur (entreprises de la catégorie, celles du corps d'état en tête)</label><select data-f="entreprise_id"><option value="">— Choisir —</option>${entOpts(c)}</select>${dv()}
  ${FINANCES?`<div class="row" style="flex-wrap:wrap">${SU.map(([k,l,t])=>suIn(k,l,t,c)).join("")}</div>`:""}`}</div>`:""}
 ${saved?planCard(c,canE&&!E):""}<p class="meta">${t?"Ticket "+esc(t.ref)+" · ":"Sans ticket · "}${esc(catLab(c))} · Priorité ${PR[c.priorite]}</p>
 <p>Responsable : <b>${esc(respN(c))}</b></p>
 <p>${mode==="e"?`<b>${esc(ent?ent.entreprise:c.prestataire||"")}</b>${ent?`<br>${esc(ent.contact||"")} · ${esc(ent.email||"")} · ${esc(fmtTel(ent.mobile))}`:""}`:`Attribué à : ${esc(c.agents_noms||"à désigner")}`}</p>${mode==="e"&&saved&&canE&&!E?dv():""}
 ${saved&&mode==="e"&&FINANCES?`<p class="meta">${SU.map(([k,l,t])=>suVw(k,l,t,c)).join(" · ")}</p>`:""}
 ${saved?`<p><span class="tag">${ET[c.etat]}</span></p>`:""}
 ${saved&&(canE||mine)?`<div class="btns">${Object.entries(ET).filter(([k])=>k!==c.etat&&!(ag&&k==="annulee")&&!(k==="a_planifier"&&c.echeance)&&!(k==="planifiee"&&!c.echeance)).map(([k,v])=>`<button class="sec" data-et="${k}">${v}</button>`).join("")}</div>`:""}
 ${saved&&canE?`<div class="btns">${mode==="e"?`<button data-mail>Envoyer le mail</button><button class="sec" data-pdf>Fiche PDF</button><button class="sec" data-word>Fiche Word</button>`:`<button class="sec" data-pdf>Fiche PDF</button><button class="sec" data-word>Fiche Word</button><button class="sec" data-mail>E-mail</button>`}${c.ticket_id&&tk.some(x=>x.id===c.ticket_id)?`<button class="sec" data-another>Nouvelle intervention pour ce ticket</button>`:""}</div>`:""}
 ${saved?`<h3>Notes</h3><div id="inl"></div>${r==="supervision"?"":`<textarea id="inm" rows="2" aria-label="Nouvelle note" style="margin-top:8px"></textarea><button data-nadd style="margin-top:6px">Ajouter la note</button>`}${(canE||r==="supervision")?`<h3>Historique des modifications</h3><div id="ih"></div>`:""}`
 :`${PH()?'<div id="phzs"></div>':""}<p class="msg" id="imsg"></p><button data-create>Créer l'intervention</button> <button class="sec" data-icancel>Annuler</button>`}`;if(saved)$("ibody").insertAdjacentHTML("beforeend",XFOOT);phRenderT(c);if(saved){loadN();phRender("i",c,E);if(canE||r==="supervision")loadH()}else phStageRender("i")}
async function loadN(){const {data}=await sb.from("intervention_notes").select("*").eq("intervention_id",curI.id).order("created_at");
 $("inl").innerHTML=(data||[]).map(x=>`<div class="tl nt"><span>${tlTime(x.created_at)}</span><b>${esc(x.auteur)}</b> : ${esc(x.message)}</div>`).join("")||`<p class="empty" style="padding:8px">Aucune note.</p>`}
/* Un champ de texte saisi puis un clic direct sur un bouton : le changement part au moment du clic ; si la fiche est alors redessinée, le clic est perdu.
   On ne redessine donc que lorsque la modification change l'affichage ou d'autres champs. */
const QUIET=()=>["consignes","local","duree_j","bc_numero",...SU.map(x=>x[0])];
async function upd(u){const quiet=Object.keys(u).every(k=>QUIET().includes(k)||(!curI.id&&k==="titre"));
 if(curI.id){const {error}=await sb.from("interventions").update(u).eq("id",curI.id);if(error){alert("Modification impossible : "+errMsg(error));drawI();return}
  await load();curI=ints.find(x=>x.id===curI.id)||{...curI,...u}}else Object.assign(curI,u);if(!quiet)drawI()}
/* Durée : enregistrement 2 s après la dernière frappe (ou à la sortie du champ) pour pouvoir ajuster avec les flèches sans enregistrer à chaque pas */
let DUR_T=null,DUR_F=false;
$("ibody").addEventListener("input",e=>{const t=e.target;if(!t.dataset||t.dataset.f!=="duree_j")return;clearTimeout(DUR_T);DUR_T=setTimeout(()=>{DUR_T=null;durRun(t)},2000)});
$("ibody").addEventListener("focusout",e=>{const t=e.target;if(t&&t.dataset&&t.dataset.f==="duree_j"&&DUR_T){clearTimeout(DUR_T);DUR_T=null;durRun(t)}});
function durRun(t){if(!t.isConnected)return;DUR_F=true;Promise.resolve($("ibody").onchange({target:t})).finally(()=>{DUR_F=false})}
$("ibody").onchange=async e=>{const t=e.target,d=t.dataset;if(d.f==="duree_j"&&!DUR_F&&DUR_T)return;
 if(d.agent!==undefined){const ch=[...document.querySelectorAll("#ibody [data-agent]:checked")];return upd({agent_ids:ch.map(b=>b.dataset.agent),agents_noms:ch.map(b=>b.dataset.n).join(", "),entreprise_id:null,prestataire:null,prestataire_email:null})}
 if(d.dv!==undefined){devisMail=t.checked;return t.checked&&!curI.devis_demande_at?upd({devis_demande_at:today()}):drawI()}
 if(!d.f)return;let u=norm(t);
 if(d.f==="mode"){const to=t.value,hasA=(curI.agent_ids||[]).length>0,hasE=!!curI.entreprise_id;
  if(curI.id&&((to==="e"&&hasA)||(to==="a"&&hasE))&&!confirm(to==="e"?"Attribuer à une entreprise retire les agents actuellement désignés. Continuer ?":"Attribuer à des agents retire l'entreprise actuellement désignée. Continuer ?")){drawI();return}
  imode=to;if(to==="e"){if(!hasA){drawI();return}u={agent_ids:[],agents_noms:null}}else u={entreprise_id:null,prestataire:null,prestataire_email:null}}
 if(d.f==="entreprise_id"){const en=ents.find(x=>x.id===u.entreprise_id);u=en?{entreprise_id:en.id,prestataire:en.entreprise+(en.contact?" – "+en.contact:""),prestataire_email:en.email,agent_ids:[],agents_noms:null}:{entreprise_id:null,prestataire:null,prestataire_email:null}}
 if(d.f==="titre"&&!u.titre){alert("Le titre est obligatoire.");drawI();return}
 if(d.f==="duree_j"&&u.duree_j!==null&&!(u.duree_j>=0.25&&u.duree_j<=365&&Math.abs(u.duree_j*4-Math.round(u.duree_j*4))<1e-9)){alert("La durée s'exprime en jours, par quart de journée (0,25 ; 0,5 ; 0,75 ; 1…), de 0,25 à 365 jours.");drawI();return}
 if(d.f==="bc_numero"&&u.bc_numero){u.bc_numero=u.bc_numero.trim();if(u.bc_numero.length<12){alert("Le numéro de bon de commande doit comporter au moins 12 caractères.");drawI();return}}upd(u)};
async function setEt(k){let j=null;if(k==="annulee"){const r=await askJust("Annulation de l'intervention "+curI.ref+" – justification obligatoire");if(!r)return;j="Annulation : "+r}
 if(k==="terminee"){const wp=PH()&&phCan("i",curI),r=await askJust("Clôture de l'intervention "+curI.ref,wp);if(!r)return;j=wp?r.j:r;
  if(wp&&r.files.length){const u=await phSend("i",curI.id,r.files.slice(0,PHN),$("phm")||{},{cloture:true,max:PHCL});if(u.bad.length&&!confirm("Certaines photos de clôture n'ont pas pu être envoyées :\n"+u.bad.join("\n")+"\n\nClôturer quand même l'intervention ?"))return}}
 const {error}=await sb.rpc("intervention_etat",{p_id:curI.id,p_etat:k,p_justif:j});if(error){alert("Modification impossible : "+errMsg(error));return}
 const tid=curI.ticket_id,t=tid&&tk.find(x=>x.id===tid),au=t?ints.filter(x=>x.ticket_id===tid&&x.id!==curI.id&&!["terminee","annulee"].includes(x.etat)).length:0;
 if(k==="terminee"&&t&&!isAg()&&!["resolue","refusee","archivee"].includes(t.statut)&&au===0){
  if(await askYN(`Souhaitez-vous clôturer le ticket ${t.ref} en cours ?`,`L'intervention ${curI.ref} est terminée. Le ticket passerait en « Résolu ».`)){
   const j2=await askJust("Clôture du ticket "+t.ref);
   if(j2){const r=await sb.rpc("ticket_changer_statut",{p_id:tid,p_statut:"resolue",p_justif:j2});if(r.error)alert("Le ticket n'a pas pu être clôturé : "+errMsg(r.error))}
   else alert(`Le ticket ${t.ref} n'a pas été clôturé : une justification est obligatoire. Vous pouvez le clôturer depuis sa fiche.`)}}
 await load();curI=ints.find(x=>x.id===curI.id)||curI;drawI()}
async function createI(){const c=curI,o={};["site_id","zone_id","local","categorie_id","corps_etat_id","titre","consignes","priorite","echeance","duree_j","etat","responsable_id","agent_ids","agents_noms","prestataire","prestataire_email","entreprise_id",...SU.map(x=>x[0])].forEach(k=>{if(c[k]!==undefined)o[k]=c[k]});
 if(o.entreprise_id){o.agent_ids=[];o.agents_noms=null}else if((o.agent_ids||[]).length){o.prestataire=null;o.prestataire_email=null}
 if(!o.titre||!o.site_id||!o.zone_id||!o.categorie_id){$("imsg").textContent="Titre, site, zone et catégorie sont obligatoires.";return}
 const tid=pendingTicket?pendingTicket.id:null,{data,error}=await sb.from("interventions").insert({...o,ticket_id:tid}).select().single();
 if(error){$("imsg").textContent="Création impossible : "+errMsg(error);return}
 if(PH()&&PHST.i.length){const r=await phStageSend("i","intervention_id",data.id,$("imsg"));if(r.bad.length)alert("L'intervention est créée, mais des photos n'ont pas pu être ajoutées :\n"+r.bad.join("\n")+"\nVous pourrez les ajouter depuis la fiche de l'intervention.");phStageClear("i")}
 const t=tid&&tk.find(x=>x.id===tid);if(t&&["nouvelle","resolue"].includes(t.statut)){await sb.from("tickets").update({statut:"en_cours"}).eq("id",tid);if(t.statut==="resolue")await sb.from("ticket_suivi").insert({ticket_id:tid,auteur:nm(),message:`Ticket rouvert : nouvelle intervention ${data.ref}`})}
 await load();curI=ints.find(x=>x.id===data.id)||data;ed=false;drawI()}
// ===== FICHE D'INTERVENTION : un même modèle, deux formats (PDF et Word) =====
const FM={W:210,H:297,M:14,T:12,B:16,CW:182},FC={blue:"#102d69",orange:"#b7791f",grey:"#5b6573",line:"#b9c2d3",cream:"#fdf6ef",ph:"#dfe5ee"};
const fsafe=t=>String(t==null?"":t).replace(/[\u2018\u2019]/g,"'").replace(/[\u201c\u201d]/g,'"').replace(/\u2026/g,"...").replace(/[\u202f\u00a0]/g," ");
const feur=v=>(+v).toLocaleString("fr-FR",{minimumFractionDigits:2,maximumFractionDigits:2}).replace(/[\u202f\u00a0]/g," ")+" €";
/* Toute photo est redessinée en JPEG standard (baseline, orientation appliquée, dimensions réelles) : évite les cadres gris du PDF et les déformations */
async function fichePhNorm(blob){const bm=await createImageBitmap(blob,{imageOrientation:"from-image"}),k=Math.min(1,1800/Math.max(bm.width,bm.height)),w=Math.max(1,Math.round(bm.width*k)),h=Math.max(1,Math.round(bm.height*k)),cv=document.createElement("canvas");cv.width=w;cv.height=h;const x=cv.getContext("2d");x.fillStyle="#fff";x.fillRect(0,0,w,h);x.drawImage(bm,0,0,w,h);if(bm.close)bm.close();
 const out=await new Promise(r=>cv.toBlob(r,"image/jpeg",.88));if(!out)throw new Error("encodage");return{buf:new Uint8Array(await out.arrayBuffer()),w,h}}
/* Mise en page des photos d'un lot : colonnes selon le nombre, hauteur maximale selon la place restante */
function fichePhLay(bs,avail){const ng=bs.length;if(!ng)return;bs.forEach(g=>{const r=Math.ceil(g.items.length/3);g.cols=Math.ceil(g.items.length/r);g.rows=Math.ceil(g.items.length/g.cols)});
 const R=bs.reduce((a,g)=>a+g.rows,0),ih=Math.max(30,Math.min(100,Math.floor((avail-7.5*ng-6.5*R-8)/R)));bs.forEach(g=>g.ih=ih)}
async function fichePhotos(c){
 if(!PH())return{t:[],i:[]};
 const get=async(col,id,g)=>{if(!id)return[];const {data}=await sb.from("photos").select("*").eq(col,id).order("created_at"),out=[];
  for(const p of data||[]){const r=await sb.storage.from("photos").download(p.chemin);if(r.error||!r.data)continue;const buf=new Uint8Array(await r.data.arrayBuffer());let w=p.largeur,h=p.hauteur;
   let b2=buf;try{const n=await fichePhNorm(r.data);b2=n.buf;w=n.w;h=n.h}catch(_){if(!w||!h){w=4;h=3}}
   out.push({buf:b2,w,h,g,n:out.length+1,cap:`${p.auteur||"—"} · ${fdate(p.created_at)}`})}return out};
 return{t:await get("ticket_id",c.ticket_id,"t"),i:await get("intervention_id",c.id,"i")}}
async function ficheModel(c){
 const t=c.ticket_id&&tk.find(x=>x.id===c.ticket_id),en=ents.find(e=>e.id===c.entreprise_id),ph=await fichePhotos(c),B=[];
 B.push({k:"head",ref:c.ref,sub:`${ET[c.etat]} · émise le ${fdate(new Date())} par ${nm()}`});
 B.push({k:"note",text:"Informations pré-remplies par l'application (page 1) – à compléter par l'opérateur (page 2)"});
 B.push({k:"bar",text:"INTERVENTION – "+catLab(c)});
 const rows=[[{l:"Titre",v:c.titre,s:3}],[{l:"Priorité",v:PR[c.priorite]},{l:"Responsable",v:respN(c)},{l:"Ticket d'origine",v:t?`${t.ref} – ${t.titre}`:"—"}]];
 if(t)rows.push([{l:"Demandé par",v:t.demandeur_nom||"—",s:2},{l:"Ticket créé le",v:fdate(t.created_at)}]);
 B.push({k:"grid",w:[.40,.30,.30],rows});
 B.push({k:"bar",text:"LIEU"});B.push({k:"grid",w:[.38,.31,.31],rows:[[{l:"Site",v:siteN(c.site_id)},{l:"Zone",v:zoneN(c.zone_id)},{l:"Local",v:c.local||"—"}]]});
 B.push({k:"bar",text:"PLANIFICATION ET INTERVENANTS"});
 const pl=[{l:"Date d'intervention",v:c.echeance?fdate(c.echeance):"À planifier"},{l:"Durée prévue",v:c.duree_j?fduree(c.duree_j):"—"}];
 if(c.entreprise_id||c.prestataire){B.push({k:"grid",w:[.34,.22,.44],rows:[[...pl,{l:"Entreprise",v:en?eLab(en):c.prestataire}],[{l:"Contact (e-mail)",v:c.prestataire_email||(en&&en.email)||"—"},{l:"N° de bon de commande",v:c.bc_numero||"—"},{l:"Montant BC HT",v:c.montant_bc_ht!=null?feur(c.montant_bc_ht):"—"}]]})}
 else B.push({k:"grid",w:[.34,.22,.44],rows:[[...pl,{l:"Intervenant(s)",v:c.agents_noms||"À désigner"}]]});
 B.push({k:"callout",label:"CONSIGNES",text:c.consignes||"Aucune consigne particulière.",strong:1});
 if(t)B.push({k:"callout",label:"DESCRIPTION DU PROBLÈME (ticket)",text:t.description||"—"});
 const all=[...ph.t,...ph.i],grp=a=>{const o=[],x=a.filter(p=>p.g==="t"),y=a.filter(p=>p.g==="i");if(x.length)o.push({k:"photos",title:`Photos du ticket (${ph.t.length})`,items:x});if(y.length)o.push({k:"photos",title:`Photos de l'intervention (${ph.i.length})`,items:y});return o};
 // la page 1 reçoit autant de photos qu'il y en a de place (estimation commune au PDF et au Word) ; le reste va en annexe
 const est=(x,cpl,lh)=>String(x||"").split("\n").reduce((n,l)=>n+Math.max(1,Math.ceil(l.length/cpl)),0)*lh,ent=!!(c.entreprise_id||c.prestataire);
 let left0=0,left=269-(26+6.8+9+9+(t?9:0)+4+6.8+9+4+6.8+(ent?18:9)+4+8.5+est(c.consignes||"Aucune consigne particulière.",78,4.9)+7+(t?8.5+est(t.description||"—",92,4.5)+7:0))-16-6.8,n1=0;left0=left;
 for(const g of [ph.t,ph.i]){if(!g.length)continue;const rows=Math.floor((left-5.5)/36.5);if(rows<1)break;const take=Math.min(g.length,rows*3);n1+=take;left-=5.5+Math.ceil(take/3)*36.5;if(take<g.length)break}
 if(n1){B.push({k:"bar",text:"PHOTOS"});const g1=grp(all.slice(0,n1));fichePhLay(g1,left0-(all.length>n1?7:0));B.push(...g1)}
 if(all.length>n1)B.push({k:"note",text:"Les autres photos figurent en annexe, à la fin de la fiche."})
 // ---- page 2 : à compléter par l'opérateur ----
 B.push({k:"pagebreak"},{k:"bar",text:"À COMPLÉTER PAR L'OPÉRATEUR – retour sur l'intervention",color:"orange"});B.push({k:"space",h:2});
 B.push({k:"bar",text:"RÉALISATION"});
 B.push({k:"grid",w:[.28,.28,.22,.22],min:12,rows:[[{l:"Date de réalisation"},{l:"Heure d'arrivée / début"},{l:"Heure de fin"},{l:"Durée réelle"}],[{l:"Intervenants présents (nom, société)",s:4}]]});
 B.push({k:"lines",label:"Constat à l'arrivée",h:14},{k:"lines",label:"Travaux réalisés",h:46});
 B.push({k:"table",label:"Matériel et pièces utilisées",head:["DÉSIGNATION","RÉFÉRENCE","QUANTITÉ","À COMMANDER ?"],w:[.46,.24,.14,.16],n:3});
 B.push({k:"result",main:["Problème résolu","Résolu partiellement","Non résolu"],cond:"Si résolu partiellement ou non résolu :",why:["Pièces à commander","Accès impossible","Entreprise nécessaire","Autre : ............"],next:["Nouvelle intervention à planifier","Contrôle à refaire le ...... / ...... / ......"]});
 B.push({k:"lines",label:"Observations / retour sur l'intervention",h:15},{k:"sign"});
 B.push({k:"note",text:"Une fois la fiche remplie : reporter ces informations dans l'application (état « Terminée » + justification de clôture)."});
 if(all.length>n1){B.push({k:"pagebreak"},{k:"bar",text:n1?"ANNEXE – PHOTOS (suite)":"ANNEXE – PHOTOS"},{k:"space",h:2});const g2=grp(all.slice(n1));fichePhLay(g2,260);B.push(...g2)}
 return B}
// ---------- rendu PDF ----------
function fichePdfBuild(B,ref){
 const {jsPDF}=window.jspdf,d=new jsPDF({unit:"mm",format:"a4"}),{M,CW,T,H,B:BM}=FM;let y=T;
 const rgb=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)],fill=h=>d.setFillColor(...rgb(h)),stroke=h=>d.setDrawColor(...rgb(h)),ink=h=>d.setTextColor(...rgb(h)),font=(b,s)=>{d.setFont("helvetica",b?"bold":"normal");d.setFontSize(s)};
 const room=h=>{if(y+h>H-BM){d.addPage();y=T}},wrap=(t,w,b,s)=>{font(b,s);return d.splitTextToSize(fsafe(t),w)},cbx=(x,yy,s,lw)=>{stroke(FC.blue);d.setLineWidth(lw||.4);d.rect(x,yy,s,s)};
 const bar=(txt,col)=>{room(8);fill(col);d.rect(M,y,CW,6.8,"F");ink("#ffffff");font(1,9.5);d.text(fsafe(txt),M+3,y+4.7);y+=6.8};
 for(const b of B){
  if(b.k==="head"){fill(FC.blue);d.rect(M,y,CW,16,"F");ink("#ffffff");font(1,17);d.text("FICHE D'INTERVENTION",M+4,y+10.5);font(1,13);d.text(fsafe(b.ref),M+CW-4,y+7,{align:"right"});font(0,7.5);d.text(fsafe(b.sub),M+CW-4,y+12.5,{align:"right"});y+=19}
  else if(b.k==="note"){font(0,7);ink(FC.grey);d.text(fsafe(b.text),M,y+3);y+=7}
  else if(b.k==="space")y+=b.h;
  else if(b.k==="pagebreak"){d.addPage();y=T}
  else if(b.k==="bar")bar(b.text,b.color==="orange"?FC.orange:FC.blue);
  else if(b.k==="grid"){const pad=2.2,cw=b.w.map(x=>x*CW);
   for(const row of b.rows){let ci=0;const cells=row.map(c=>{const s=c.s||1,x=M+cw.slice(0,ci).reduce((a,v)=>a+v,0),w=cw.slice(ci,ci+s).reduce((a,v)=>a+v,0);ci+=s;return{c,x,w,L:c.v?wrap(c.v,w-2*pad,1,9.5):[]}});
    const h=Math.max(b.min||9,...cells.map(o=>4+o.L.length*4.3+pad));room(h);
    cells.forEach(o=>{stroke(FC.line);d.setLineWidth(.25);d.rect(o.x,y,o.w,h);font(0,6.3);ink(FC.grey);d.text(fsafe(o.c.l||"").toUpperCase(),o.x+pad,y+3.2);if(o.L.length){font(1,9.5);ink("#000000");d.text(o.L,o.x+pad,y+7.4)}});y+=h}
   y+=4}
  else if(b.k==="callout"){const st=!!b.strong,fs=st?11:9.5,L=wrap(b.text,CW-9,0,fs),h=8.5+L.length*fs*.3528*1.32+3;room(h);
   if(st){fill(FC.cream);d.rect(M,y,CW,h,"F");fill(FC.orange);d.rect(M,y,2.4,h,"F")}stroke(FC.line);d.setLineWidth(.25);d.rect(M,y,CW,h);
   font(1,6.8);ink(st?FC.orange:FC.grey);d.text(fsafe(b.label),M+5,y+4);font(0,fs);ink("#000000");d.text(L,M+5,y+9);y+=h+4}
  else if(b.k==="photos"){const per=b.cols||3,cw=CW/per,ih=b.ih||30;room(9+ih+8);font(1,8);ink("#000000");d.text(fsafe(b.title),M,y+3);y+=5.5;
   for(let i=0;i<b.items.length;i+=per){room(ih+8);b.items.slice(i,i+per).forEach((it,k)=>{const x=M+k*cw,bw=cw-4,r=Math.min(bw/it.w,ih/it.h),w=it.w*r,h=it.h*r;
    try{d.addImage(it.buf,"JPEG",x+(bw-w)/2,y+(ih-h)/2,w,h,undefined,"FAST")}catch(_){stroke(FC.line);d.setLineWidth(.25);d.rect(x,y,bw,ih);font(0,8);ink(FC.grey);d.text("Photo non affichable",x+bw/2,y+ih/2,{align:"center"})}
    font(0,7);ink(FC.grey);d.text(fsafe(`${it.g==="t"?"T":"I"}${it.n} · ${it.cap}`),x,y+ih+3.4)});y+=ih+6.5}
   y+=2}
  else if(b.k==="lines"){const h=b.h;room(h+9);font(1,8.5);ink(FC.blue);d.text(fsafe(b.label),M,y+3.5);y+=5;stroke(FC.line);d.setLineWidth(.25);d.rect(M,y,CW,h);d.setLineWidth(.12);for(let yy=y+6.5;yy<y+h-1;yy+=6.5)d.line(M+1.5,yy,M+CW-1.5,yy);y+=h+4}
  else if(b.k==="table"){const cw=b.w.map(x=>x*CW),rh=7;room(7+rh*(b.n+1)+3);font(1,8.5);ink(FC.blue);d.text(fsafe(b.label),M,y+3.5);y+=5;
   let x=M;b.head.forEach((t,i)=>{stroke(FC.line);d.setLineWidth(.25);d.rect(x,y,cw[i],6);font(0,6.3);ink(FC.grey);d.text(fsafe(t),x+2,y+4);x+=cw[i]});y+=6;
   for(let r=0;r<b.n;r++){x=M;cw.forEach((w,i)=>{stroke(FC.line);d.rect(x,y,w,rh);if(i===cw.length-1)cbx(x+w/2-1.6,y+rh/2-1.6,3.2,.3);x+=w});y+=rh}y+=5}
  else if(b.k==="result"){room(52);bar("RÉSULTAT DE L'INTERVENTION",FC.blue);const top=y,h=42;stroke(FC.blue);d.setLineWidth(.5);d.rect(M,top,CW,h);
   const n=b.main.length;b.main.forEach((t,i)=>{const x=M+4+i*(CW-8)/n;cbx(x,top+4.2,5,.5);font(1,11);ink("#000000");d.text(fsafe(t),x+7.5,top+8.2)});
   font(0,8);ink(FC.grey);d.text(fsafe(b.cond),M+4,top+16);b.why.forEach((t,i)=>{const x=M+4+i*(CW-8)/b.why.length;cbx(x,top+18.2,4,.35);font(0,9.5);ink("#000000");d.text(fsafe(t),x+6,top+21.6)});
   stroke(FC.line);d.setLineWidth(.25);d.line(M+4,top+27,M+CW-4,top+27);
   b.next.forEach((t,i)=>{const x=M+4+i*(CW-8)/2;cbx(x,top+31.2,5,.5);font(1,10.5);ink("#000000");d.text(fsafe(t),x+7.5,top+35.2)});
   y+=h+5}
  else if(b.k==="sign"){room(25);const h=23;stroke(FC.line);d.setLineWidth(.25);d.rect(M,y,CW,h);d.line(M+CW/2,y,M+CW/2,y+h);
   [["Opérateur",M],["Responsable ou demandeur (visa)",M+CW/2]].forEach(([t,x])=>{font(1,9);ink("#000000");d.text(t,x+3,y+5.5);font(0,7);ink(FC.grey);d.text("Nom : ..............................   Date : ................",x+3,y+11);d.text("Signature :",x+3,y+18)});y+=h+4}
 }
 const n=d.getNumberOfPages();for(let i=1;i<=n;i++){d.setPage(i);font(0,7);ink(FC.grey);d.text(fsafe("STADES 3M – Fiche d'intervention "+ref),M,H-9);d.text(`Page ${i} / ${n}`,M+CW,H-9,{align:"right"});stroke(FC.line);d.setLineWidth(.2);d.line(M,H-12.5,M+CW,H-12.5)}
 return d}
// ---------- rendu Word (.docx écrit à la main, sans bibliothèque) ----------
function ficheDocx(B,ref){
 const TW=10318,mm=x=>Math.round(x*56.693),E=x=>Math.round(x*36000),px=s=>String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"),media=[];let did=1;
 const run=(t,o={})=>String(t==null?"":t).split("\n").map(s=>`<w:r><w:rPr>${o.f?`<w:rFonts w:ascii="${o.f}" w:hAnsi="${o.f}" w:eastAsia="${o.f}" w:cs="${o.f}"/>`:""}${o.b?"<w:b/>":""}${o.c?`<w:color w:val="${o.c.replace("#","")}"/>`:""}<w:sz w:val="${Math.round((o.s||9.5)*2)}"/></w:rPr><w:t xml:space="preserve">${px(s)}</w:t></w:r>`).join('<w:r><w:br/></w:r>');
 const par=(r,o={})=>`<w:p><w:pPr><w:keepNext w:val="${o.kn?1:0}"/><w:spacing w:before="${o.bf||0}" w:after="${o.af||0}"/>${o.jc?`<w:jc w:val="${o.jc}"/>`:""}</w:pPr>${r}</w:p>`;
 const bd=(c,sz)=>`w:val="single" w:sz="${sz||4}" w:space="0" w:color="${c.replace("#","")}"`;
 const cell=(w,body,o={})=>`<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>${o.span>1?`<w:gridSpan w:val="${o.span}"/>`:""}${o.bl||o.bt?`<w:tcBorders>${o.bl?`<w:left ${o.bl}/>`:""}</w:tcBorders>`:""}${o.fill?`<w:shd w:val="clear" w:color="auto" w:fill="${o.fill.replace("#","")}"/>`:""}<w:vAlign w:val="${o.va||"top"}"/></w:tcPr>${body||par("")}</w:tc>`;
 const tbl=(cols,rows,o={})=>`<w:tbl><w:tblPr><w:tblW w:w="${cols.reduce((a,x)=>a+x,0)}" w:type="dxa"/><w:tblBorders>${["top","left","bottom","right","insideH","insideV"].map(k=>o.nob?`<w:${k} w:val="nil"/>`:`<w:${k} ${bd(o.lc||FC.line,o.sz)}/>`).join("")}</w:tblBorders><w:tblLayout w:type="fixed"/><w:tblCellMar><w:top w:w="${o.pt??40}" w:type="dxa"/><w:left w:w="${o.pl??100}" w:type="dxa"/><w:bottom w:w="${o.pt??40}" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${cols.map(w=>`<w:gridCol w:w="${w}"/>`).join("")}</w:tblGrid>${rows.map(r=>`<w:tr><w:trPr><w:cantSplit/>${r.h?`<w:trHeight w:val="${r.h}" w:hRule="${r.hr||"atLeast"}"/>`:""}</w:trPr>${r.c.join("")}</w:tr>`).join("")}</w:tbl>`;
 const gap=n=>par("",{af:n||60}),cb=(t,s,b)=>run("☐ ",{s:s,f:"Segoe UI Symbol",c:FC.blue})+run(t,{s:s,b});
 const img=(it,maxw,maxh)=>{const r=Math.min(maxw/it.w,maxh/it.h),w=it.w*r,h=it.h*r,n=media.length+1;media.push(it.buf);const id=did++;
  return `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${E(w)}" cy="${E(h)}"/><wp:docPr id="${id}" name="Photo ${id}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${id}" name="image${n}.jpg"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdM${n}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${E(w)}" cy="${E(h)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`};
 let X="";
 for(const b of B){
  if(b.k==="head"){const l=Math.round(TW*.58);X+=tbl([l,TW-l],[{c:[cell(l,par(run("FICHE D'INTERVENTION",{s:17,b:1,c:"#ffffff"}),{bf:100,af:100}),{fill:FC.blue,va:"center"}),cell(TW-l,par(run(b.ref,{s:13,b:1,c:"#ffffff"}),{jc:"right",bf:60})+par(run(b.sub,{s:7.5,c:"#ffffff"}),{jc:"right",af:60}),{fill:FC.blue,va:"center"})]}],{nob:1,pl:160})+gap(40)}
  else if(b.k==="note")X+=par(run(b.text,{s:7,c:FC.grey}),{af:60});
  else if(b.k==="space")X+=gap(mm(b.h)/2);
  else if(b.k==="pagebreak")X+=`<w:p><w:r><w:br w:type="page"/></w:r></w:p>`;
  else if(b.k==="bar")X+=tbl([TW],[{c:[cell(TW,par(run(b.text,{s:9.5,b:1,c:"#ffffff"}),{bf:20,af:20}),{fill:b.color==="orange"?FC.orange:FC.blue})]}],{nob:1,pl:140});
  else if(b.k==="grid"){const cw=b.w.map(x=>Math.round(x*TW));cw[cw.length-1]=TW-cw.slice(0,-1).reduce((a,v)=>a+v,0);
   X+=tbl(cw,b.rows.map(row=>{let ci=0;return{h:mm(b.min||9),c:row.map(c=>{const s=c.s||1,w=cw.slice(ci,ci+s).reduce((a,v)=>a+v,0);ci+=s;return cell(w,par(run((c.l||"").toUpperCase(),{s:6.5,c:FC.grey}))+(c.v?par(run(c.v,{s:9.5,b:1})):""),{span:s})})}})) +gap(80)}
  else if(b.k==="callout"){const st=!!b.strong;X+=tbl([TW],[{c:[cell(TW,par(run(b.label,{s:6.8,b:1,c:st?FC.orange:FC.grey}),{af:20})+par(run(b.text,{s:st?11:9.5})),{fill:st?FC.cream:null,bl:st?bd(FC.orange,36):null})]}],{pt:70,pl:140})+gap(80)}
  else if(b.k==="photos"){X+=par(run(b.title,{s:8,b:1}),{kn:1,af:60});const cols=b.cols||3,cw=Math.floor(TW/cols),mw=182/cols-4;
   for(let i=0;i<b.items.length;i+=cols){const its=b.items.slice(i,i+cols),ws=Array.from({length:cols},(_,k)=>k<cols-1?cw:TW-(cols-1)*cw);X+=tbl(ws,[{c:ws.map((w,k)=>{const it=its[k];return cell(w,it?par(img(it,mw,b.ih||30),{jc:"center"})+par(run(`${it.g==="t"?"T":"I"}${it.n} · ${it.cap}`,{s:7,c:FC.grey}),{jc:"center"}):par(""),{va:"center"})})}],{nob:1})}
   X+=gap(80)}
  else if(b.k==="lines"){X+=par(run(b.label,{s:8.5,b:1,c:FC.blue}),{kn:1,af:40});const n=Math.max(1,Math.floor(b.h/6.5));X+=tbl([TW],Array.from({length:n},()=>({h:mm(6.5),hr:"exact",c:[cell(TW,par(""))]})),{pt:0,sz:4})+gap(80)}
  else if(b.k==="table"){const cw=b.w.map(x=>Math.round(x*TW));cw[3]=TW-cw[0]-cw[1]-cw[2];X+=par(run(b.label,{s:8.5,b:1,c:FC.blue}),{kn:1,af:40})+tbl(cw,[{c:b.head.map((t,i)=>cell(cw[i],par(run(t,{s:6.5,c:FC.grey}))))},...Array.from({length:b.n},()=>({h:mm(7),hr:"exact",c:cw.map((w,i)=>cell(w,i===3?par(cb("",10),{jc:"center"}):par(""),{va:"center"}))}))])+gap(100)}
  else if(b.k==="result"){const u=Math.floor(TW/12),cw=Array(12).fill(u);cw[11]=TW-u*11;const sp=(a,n)=>cw.slice(a,a+n).reduce((x,v)=>x+v,0),bx=FC.blue,row=(items,span,s,bold,h)=>({h:mm(h),c:items.map(t=>cell(sp(0,span),par(cb(t,s,bold)),{span,va:"center"}))});
   X+=tbl([TW],[{c:[cell(TW,par(run("RÉSULTAT DE L'INTERVENTION",{s:9.5,b:1,c:"#ffffff"}),{bf:20,af:20}),{fill:FC.blue})]}],{nob:1,pl:140});
   X+=tbl(cw,[row(b.main,4,11,1,11),{c:[cell(TW,par(run(b.cond,{s:8,c:FC.grey})),{span:12})]},row(b.why,3,9.5,0,8),row(b.next,6,10.5,1,9)],{lc:bx,sz:8,pt:60})+gap(100)}
  else if(b.k==="sign"){const h=Math.floor(TW/2);X+=tbl([h,TW-h],[{h:mm(23),hr:"exact",c:[["Opérateur"],["Responsable ou demandeur (visa)"]].map((t,i)=>cell(i?TW-h:h,par(run(t[0],{s:9,b:1}))+par(run("Nom : ..............................   Date : ................",{s:7,c:FC.grey}),{bf:60})+par(run("Signature :",{s:7,c:FC.grey}),{bf:200})))}]) +gap(60)}
 }
 const NS='xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"';
 const doc=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${NS}><w:body>${X}<w:sectPr><w:footerReference w:type="default" r:id="rIdF"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="${mm(12)}" w:right="${mm(14)}" w:bottom="${mm(17)}" w:left="${mm(14)}" w:header="${mm(6)}" w:footer="${mm(7)}" w:gutter="0"/></w:sectPr></w:body></w:document>`;
 const ftr=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr ${NS}><w:p><w:pPr><w:tabs><w:tab w:val="right" w:pos="${TW}"/></w:tabs></w:pPr>${run("STADES 3M – Fiche d'intervention "+ref,{s:7,c:FC.grey})}<w:r><w:rPr><w:color w:val="5B6573"/><w:sz w:val="14"/></w:rPr><w:tab/><w:t xml:space="preserve">Page </w:t></w:r><w:r><w:rPr><w:color w:val="5B6573"/><w:sz w:val="14"/></w:rPr><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:rPr><w:color w:val="5B6573"/><w:sz w:val="14"/></w:rPr><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r><w:r><w:rPr><w:color w:val="5B6573"/><w:sz w:val="14"/></w:rPr><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:rPr><w:color w:val="5B6573"/><w:sz w:val="14"/></w:rPr><w:t>1</w:t></w:r><w:r><w:rPr><w:color w:val="5B6573"/><w:sz w:val="14"/></w:rPr><w:fldChar w:fldCharType="end"/></w:r></w:p></w:ftr>`;
 const sty=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:eastAsia="Arial" w:cs="Arial"/><w:sz w:val="19"/><w:lang w:val="fr-FR"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>`;
 const ct=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="jpg" ContentType="image/jpeg"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>`;
 const rels=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;
 const drels=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdS" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rIdF" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>${media.map((_,i)=>`<Relationship Id="rIdM${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image${i+1}.jpg"/>`).join("")}</Relationships>`;
 const enc=new TextEncoder(),es=[["[Content_Types].xml",enc.encode(ct)],["_rels/.rels",enc.encode(rels)],["word/document.xml",enc.encode(doc)],["word/_rels/document.xml.rels",enc.encode(drels)],["word/styles.xml",enc.encode(sty)],["word/footer1.xml",enc.encode(ftr)],...media.map((m,i)=>["word/media/image"+(i+1)+".jpg",m])].map(([name,buf])=>({name,buf}));
 return new Blob([zipBlob(es)],{type:"application/vnd.openxmlformats-officedocument.wordprocessingml.document"})}
async function ficheExport(btn,fmt){const old=btn.textContent;btn.disabled=true;btn.textContent="Préparation…";
 try{const c=curI,B=await ficheModel(c);if(fmt==="pdf")fichePdfBuild(B,c.ref).save(`fiche-${c.ref}.pdf`);else dlB(ficheDocx(B,c.ref),`fiche-${c.ref}.docx`)}
 catch(e){alert("La fiche n'a pas pu être générée : "+errMsg(e))}
 btn.disabled=false;btn.textContent=old}
function mailI(){const c=curI,e=c.entreprise_id||c.prestataire?"e":"a",ent=ents.find(x=>x.id===c.entreprise_id),dv=e==="e"&&devisMail,ce=(corps.find(x=>x.id===c.corps_etat_id)||{}).nom;
 const to=e==="e"?(ent?ent.email:c.prestataire_email)||"":agents.filter(a=>(c.agent_ids||[]).includes(a.id)).map(a=>a.email).filter(Boolean).join(",");
 const m=mdl(e==="a"?"regie":dv?"devis":"entreprise"),v={ref:c.ref,titre:c.titre,consignes:c.consignes,site:siteN(c.site_id),SITE:siteN(c.site_id).toUpperCase(),zone:zoneN(c.zone_id),local:c.local,corps_etat:ce,priorite:PR[c.priorite],echeance:c.echeance?fdate(c.echeance):"",duree:c.duree_j?fduree(c.duree_j):"",signataire:nm()};
 const obj=fill(m.objet,v),url="mailto:"+to+"?subject="+encodeURIComponent(obj)+"&body="+encodeURIComponent(fill(m.corps,v));
 sb.rpc("intervention_mail",{p_id:c.id,p_dest:to,p_objet:obj}).then(()=>{if($("ih"))loadH()},()=>{});
 const a=document.createElement("a");a.href=url;a.rel="noopener noreferrer";document.body.appendChild(a);a.click();a.remove()}
$("ibody").onclick=async e=>{const b=e.target.closest("[data-edit],[data-et],[data-create],[data-pdf],[data-word],[data-mail],[data-nadd],[data-another]");if(!b)return;const d=b.dataset;
 if("edit" in d){ed=!ed;drawI()}else if(d.et)setEt(d.et);else if("create" in d)createI();else if("another" in d){const t=tk.find(x=>x.id===curI.ticket_id);pendingTicket=t;openIv(null,t)}else if("pdf" in d)ficheExport(b,"pdf");else if("word" in d)ficheExport(b,"word");else if("mail" in d)mailI();
 else if("nadd" in d){const m=$("inm").value.trim();if(!m)return;const {error}=await sb.from("intervention_notes").insert({intervention_id:curI.id,auteur:nm(),message:m});if(error)alert(errMsg(error));else{$("inm").value="";loadN()}}};
// ===== ANNUAIRE (console admin) =====
function fillCorpsAnn(){const ks=[...document.querySelectorAll("#en_k [data-ec]:checked")].map(b=>+b.dataset.ec),cur=$("en_c").value,seen=new Set();
 const l=corps.filter(x=>ks.includes(x.categorie_id)&&!seen.has(x.nom)&&seen.add(x.nom));
 $("en_c").innerHTML=`<option value="">Corps d'état (facultatif)</option>`+O(l.map(x=>[x.id,x.nom]),cur)}
function renderAnn(){
 $("en_k").innerHTML=`<b style="font-size:13px">Apparaît dans les catégories :</b> `+cats.map(c=>`<label class="ck" style="display:inline-flex;margin-right:14px"><input type="checkbox" data-ec="${c.id}" checked> ${esc(c.nom)}</label>`).join("");
 fillCorpsAnn();$("en_l").innerHTML=`<div class="table"><table><thead><tr><th>Entreprise</th><th>Catégories</th><th>Corps d'état</th><th>Chargé d'affaires</th><th>E-mail</th><th>Mobile</th><th></th></tr></thead><tbody>${ents.map(e=>`<tr><td>${esc(e.entreprise)}</td><td>${esc((e.categorie_ids||[]).map(i=>(cats.find(c=>c.id===i)||{}).nom).filter(Boolean).join(", ")||"Toutes")}</td><td>${esc((corps.find(x=>x.id===e.corps_etat_id)||{}).nom||"—")}</td><td>${esc(e.contact||"")}</td><td>${esc(e.email||"")}</td><td class="nw">${esc(fmtTel(e.mobile))}</td><td class="nw"><a class="lnk" data-ee="${e.id}">modifier</a> · <a class="lnk" data-en="${e.id}">supprimer</a></td></tr>`).join("")||`<tr><td colspan="7" class="empty">Annuaire vide.</td></tr>`}</tbody></table></div>`}
$("en_t").oninput=()=>{$("en_t").value=fmtTel($("en_t").value)};$("en_k").onchange=fillCorpsAnn;
let enEd=null;
const enReset=()=>{enEd=null;["en_e","en_n","en_m","en_t"].forEach(i=>$(i).value="");$("en_b").textContent="Ajouter";$("en_x").classList.add("hide");document.querySelectorAll("#en_k [data-ec]").forEach(b=>b.checked=true);fillCorpsAnn();$("en_c").value=""};
$("en_b").onclick=()=>{if(!$("en_e").value.trim())return;const ks=[...document.querySelectorAll("#en_k [data-ec]:checked")].map(b=>+b.dataset.ec);if(!ks.length){alert("Cochez au moins une catégorie.");return}
 const o={corps_etat_id:$("en_c").value||null,categorie_ids:ks,entreprise:$("en_e").value.trim(),contact:$("en_n").value.trim()||null,email:$("en_m").value.trim()||null,mobile:fmtTel($("en_t").value)||null};
 const q=enEd?sb.from("entreprises").update(o).eq("id",enEd):sb.from("entreprises").insert(o);enReset();adm(q)};
$("en_x").onclick=enReset;
$("en_l").onclick=e=>{const a=e.target.closest("[data-en],[data-ee]");if(!a)return;
 if(a.dataset.en){if(confirm("Supprimer cette entreprise de l'annuaire ?"))adm(sb.from("entreprises").delete().eq("id",a.dataset.en));return}
 const x=ents.find(v=>v.id==a.dataset.ee);if(!x)return;enEd=x.id;
 document.querySelectorAll("#en_k [data-ec]").forEach(b=>b.checked=!(x.categorie_ids||[]).length||x.categorie_ids.includes(+b.dataset.ec));fillCorpsAnn();
 $("en_c").value=x.corps_etat_id||"";$("en_e").value=x.entreprise;$("en_n").value=x.contact||"";$("en_m").value=x.email||"";$("en_t").value=fmtTel(x.mobile);
 $("en_b").textContent="Enregistrer les modifications";$("en_x").classList.remove("hide");$("en_e").scrollIntoView({block:"center"})};
const NOTICE={demandeur:"notices/notice_demandeur.html",responsable:"notices/notice_responsable.html",supervision:"notices/notice_supervision.html",agent_travaux:"notices/notice_agent.html",agent_exploitation:"notices/notice_agent.html",admin:"notices/notice_administrateur.html"};
$("hlp").onclick=()=>window.open(NOTICE[role()]||"notices/notice_demandeur.html","_blank","noopener,noreferrer");
$("sug").onclick=()=>{$("sugt").value="Amélioration";$("sugti").value="";$("sugtx").value="";$("sugm").textContent="";$("sugb").disabled=false;const adm=me.role==="admin";$("sgtabs").classList.toggle("hide",!adm);$("sgt_p").classList.toggle("hide",!(adm&&SGN>0));sgTab(adm&&SGN>0?"p":"n");$("dS").showModal()};
let SGN=0;
function setSgn(n){SGN=n;const b=$("sug"),t=n>0?`${n} problème${n>1?"s":""} signalé${n>1?"s":""} non traité${n>1?"s":""} – Problèmes et suggestions`:"Signaler un problème ou faire une suggestion";b.classList.toggle("alert",n>0);b.title=t;b.setAttribute("aria-label",t);const tp=$("sgt_p");if(tp)tp.classList.toggle("hide",!(n>0&&me&&me.role==="admin"))}
let SGM="l";const isPb=x=>x.type==="Problème rencontré",typL=t=>t==="Idée"?"Nouvelle fonctionnalité":t;
function sgTab(k){SGM=["p","l","v"].includes(k)?k:"n";["n","p","l","v"].forEach(t=>{const b=$("sgt_"+t);b.classList.toggle("on",t===SGM);b.setAttribute("aria-selected",t===SGM)});$("sg_new").classList.toggle("hide",SGM!=="n");$("sg_list").classList.toggle("hide",SGM==="n");if(SGM!=="n")renderSug()}
function setSgc(r,v,p){$("sgn").textContent=`(${r})`;$("sgv").textContent=`(${v})`;$("sgp").textContent=`(${p})`}
$("sgtabs").onclick=e=>{const b=e.target.closest("[data-sgt]");if(b)sgTab(b.dataset.sgt)};
async function sugAlert(){if(!me||me.role!=="admin")return;const {data,error}=await sb.from("suggestions").select("type,traitee");if(error)return;setSgn(data.filter(x=>isPb(x)&&!x.traitee).length);setSgc(data.filter(x=>!x.traitee&&!isPb(x)).length,data.filter(x=>x.traitee).length,data.filter(x=>isPb(x)&&!x.traitee).length)}
$("sugb").onclick=async()=>{const ti=$("sugti").value.trim();$("sugm").style.color="";if(!ti){$("sugm").textContent="Le titre est obligatoire.";return}
 $("sugb").disabled=true;
 const {error}=await sb.from("suggestions").insert({auteur_nom:nm(),role:me.role,type:$("sugt").value,titre:ti,texte:$("sugtx").value.trim()||null});
 $("sugb").disabled=false;
 if(error){$("sugm").textContent="Envoi impossible : "+errMsg(error);return}
 $("sugti").value="";$("sugtx").value="";$("sugt").value="Amélioration";$("sugm").style.color="var(--ok)";$("sugm").textContent="Merci, votre suggestion a été transmise à l'administrateur. Vous pouvez en saisir une autre.";$("sugti").focus();sugAlert()};
["sugti","sugtx","sugt"].forEach(i=>$(i).addEventListener("input",()=>{$("sugm").textContent=""}));
let SG=[];
async function renderSug(){const {data}=await sb.from("suggestions").select("*").order("created_at",{ascending:false});SG=data||[];setSgn(SG.filter(x=>isPb(x)&&!x.traitee).length);setSgc(SG.filter(x=>!x.traitee&&!isPb(x)).length,SG.filter(x=>x.traitee).length,SG.filter(x=>isPb(x)&&!x.traitee).length);if(SGM==="p"&&!SGN){SGM="l";["n","p","l","v"].forEach(t=>$("sgt_"+t).classList.toggle("on",t===SGM))}const VUE=SG.filter(x=>SGM==="v"?x.traitee:SGM==="p"?(isPb(x)&&!x.traitee):(!x.traitee&&!isPb(x)));
 const SPR={haute:"Haute",normale:"Normale",basse:"Basse"},rowS=x=>`<div class="suivi">${x.type==="Problème rencontré"&&!x.traitee?'<span class="tag t-np">À traiter</span> ':""}<b>${esc(typL(x.type))}</b> – ${esc(x.titre)} <select data-sp="${x.id}" aria-label="Priorité" style="width:auto;display:inline-block;margin:0 4px">${Object.entries(SPR).reverse().map(([k,l])=>`<option value="${k}"${(x.priorite||"normale")===k?" selected":""}>${l}</option>`).join("")}</select><label class="ck" style="display:inline-flex;margin:0 4px"><input type="checkbox" data-sv="${x.id}"${x.traitee?" checked":""} aria-label="Marquer comme traitée"> Traitée</label><button class="sec ic" data-se="${x.id}" title="Modifier" aria-label="Modifier">✎</button> <button class="sec ic" data-sd="${x.id}" title="Supprimer" aria-label="Supprimer">${TRASH}</button> <small>(${esc(x.auteur_nom||"")} · ${esc(ROLES[x.role]||"")} · ${tlTime(x.created_at)})</small>${x.texte?`<br>${esc(x.texte)}`:""}</div>`;
 $("sug_l").innerHTML=["haute","normale","basse"].map(p=>{const L=VUE.filter(x=>(x.priorite||"normale")===p);return L.length?`<h4 class="sgp sgp-${p}">Priorité ${SPR[p].toLowerCase()} (${L.length})</h4>`+L.map(rowS).join(""):""}).join("")||`<p class="empty" style="padding:8px">${SGM==="v"?"Aucune idée traitée.":SGM==="p"?"Aucun problème en cours.":"Aucune idée à traiter."}</p>`}
let SE=null;
function editSug(id){const x=SG.find(s=>String(s.id)===String(id));if(!x)return;SE=x.id;$("se_t").value=typL(x.type);$("se_ti").value=x.titre||"";$("se_tx").value=x.texte||"";$("se_m").textContent="";$("dSE").showModal()}
$("se_ok").onclick=async()=>{if(!$("se_ti").value.trim()){$("se_m").textContent="Le titre est obligatoire.";return}
 const {error}=await sb.from("suggestions").update({type:$("se_t").value,titre:$("se_ti").value.trim(),texte:$("se_tx").value.trim()||null}).eq("id",SE);if(error){$("se_m").textContent=errMsg(error);return}$("dSE").close();renderSug()};
$("sug_l").onclick=async e=>{const b=e.target.closest("[data-se],[data-sd]");if(!b)return;if(b.dataset.sd){if(!confirm("Supprimer cette suggestion ?"))return;await sb.from("suggestions").delete().eq("id",b.dataset.sd);renderSug()}else editSug(b.dataset.se)};
$("sug_l").onchange=async e=>{const c=e.target;if(c.dataset.sp!==undefined){const {error}=await sb.from("suggestions").update({priorite:c.value}).eq("id",c.dataset.sp);if(error)alert(errMsg(error));renderSug();return}if(c.dataset.sv===undefined)return;await sb.from("suggestions").update({traitee:c.checked}).eq("id",c.dataset.sv);renderSug()};
$("irows2").onclick=$("irows").onclick;
// ===== Fenêtres : fermeture au clic à côté =====
document.addEventListener("click",e=>{const b=e.target.closest("[data-close]"),d=b&&b.closest("dialog");if(d&&d.open)d.close()});
document.querySelectorAll("dialog").forEach(d=>{if(d.id==="dPw")return;d.addEventListener("click",e=>{if(e.target!==d||d.id==="dNew"||d.id==="dS"||d.id==="dPl"||(d.id==="dIv"&&curI&&!curI.id))return;const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close()})});

const catOpts=()=>cats.map(c=>`<option value="${c.id}">${esc(c.nom)}</option>`).join("");
const corpsOpts=cid=>`<option value="">— Choisir un corps d'état —</option>`+corps.filter(x=>x.actif!==false&&x.categorie_id==cid).map(x=>`<option value="${x.id}">${esc(x.nom)}</option>`).join("");
$("ncat").onchange=()=>$("ncorps").innerHTML=corpsOpts($("ncat").value);
// ===== COMPTEURS D'EAU (base de test uniquement, 4.15.0) =====
const CPOK=()=>ENV==="test"&&["admin","responsable","supervision"].includes(role()),canCp=()=>ENV==="test"&&["admin","responsable"].includes(role());
const CCOLS={
 nom:{...mk("Compteur",s=>s.c.nom+(s.c.actif?"":" (inactif)")),c:"tt",lock:1,h:s=>`<b>${esc(s.c.nom)}</b>${s.c.actif?"":" (inactif)"}`},
 ref:{...mk("Réf. concessionnaire",s=>s.c.ref_concessionnaire||"—"),c:"lc"},
 zone:{...mk("Zone",s=>s.c.zone_id?zoneN(s.c.zone_id):"—"),c:"lc"},local:{...mk("Local",s=>s.c.local||"—"),c:"lc"},
 idx:{l:"Dernier index (m³)",c:"nw num",v:s=>s.lastR?fm3(s.lastR.index_m3):"—",k:s=>s.lastR?+s.lastR.index_m3:-1},
 rel:{l:"Relevé",c:"nw",v:s=>s.lastR?fdate(s.lastR.releve_at):"—",k:s=>s.lastR?ts(s.lastR.releve_at):0},
 cj:{l:"Conso/j",c:"nw num",v:s=>fm3(s.cj),k:s=>s.cj==null?-1:s.cj},
 base:{l:"Moyenne/j",c:"nw num",v:s=>fm3(s.base),k:s=>s.base==null?-1:s.base},
 ecart:{l:"Écart",c:"nw num",v:s=>s.ecart==null?"—":(s.ecart>0?"+":"")+Math.round(s.ecart)+" %",k:s=>s.ecart==null?-1e9:s.ecart},
 st:{l:"Statut",c:"nw",v:s=>s.al.length?s.al.join(" ; "):"OK",k:s=>s.al.length,h:s=>s.al.length?`<span class="tag" style="color:var(--bad);border-color:var(--bad);background:#fbe9e7" title="${esc(s.al.join(" ; "))}">${esc(s.al[0])}${s.al.length>1?` +${s.al.length-1}`:""}</span>`:'<span class="tag s-resolue">OK</span>'}};
Object.entries({nom:200,ref:150,zone:110,local:120,idx:135,rel:110,cj:95,base:105,ecart:95,st:240}).forEach(([k,w])=>CCOLS[k].w=w);
CB.c=CCOLS;TB.c={f:{},s:{k:null,d:1},base:[]};
let CP=[],RL=[],APP=[],CPL=false,CPERR="",CPD=90,CPE=null,CPCUR=null;
const fm3=n=>n==null||isNaN(n)?"—":(+n).toLocaleString("fr-FR",{maximumFractionDigits:3}),
 gmap=c=>c.latitude!=null&&c.longitude!=null?`https://www.google.com/maps?q=${c.latitude},${c.longitude}`:"",
 cpUrl=c=>new URL("releve.html?c="+encodeURIComponent(c.token),location.href).href,
 fdh=d=>new Date(d).toLocaleString("fr-FR",{day:"2-digit",month:"2-digit",year:"2-digit",hour:"2-digit",minute:"2-digit"});
async function loadCp(){CPL=true;CPERR="";
 const q=async(t,fn)=>{let r=[];for(let i=0;;i+=1000){const {data,error}=await fn(sb.from(t).select("*")).range(i,i+999);if(error)throw error;r=r.concat(data);if(data.length<1000)break}return r};
 try{CP=await q("compteurs",b=>b.order("id"));
  RL=await q("releves_compteur",b=>b.gte("releve_at",new Date(Date.now()-420*864e5).toISOString()).order("releve_at").order("id"));
  APP=await q("appareils_compteur",b=>b.order("derniere_vue",{ascending:false}).order("appareil_id"))}
 catch(e){CPERR=/does not exist|schema cache|Could not find/i.test(e.message||"")?"Le module Compteurs n'est pas installé sur cette base : exécutez migration_4_14_0_compteurs.sql.":errMsg(e);CP=[];RL=[];APP=[]}
 renderCp()}
// Analyse d'un compteur : consommation par jour sur chaque intervalle entre relevés valides (durée comptée pour 12 h minimum, pour ne pas gonfler la consommation de relevés très rapprochés)
function cpStats(c){const all=RL.filter(r=>r.compteur_id==c.id&&r.statut!=="rejete"),val=all.filter(r=>r.statut==="valide"),pts=[];
 val.forEach(r=>pts.push({t:new Date(r.releve_at).getTime(),x:+r.index_m3,r}));
 const iv=[];for(let i=1;i<pts.length;i++){const j=(pts[i].t-pts[i-1].t)/864e5,d=pts[i].x-pts[i-1].x;if(j>0&&d>=0)iv.push({t0:pts[i-1].t,t1:pts[i].t,j,d,cj:d/Math.max(j,.5)})}
 const L=iv[iv.length-1],lastR=all[all.length-1],al=[];let base=null;
 if(L){const h=iv.slice(0,-1).filter(v=>v.t1>=L.t0-60*864e5),sj=h.reduce((s,v)=>s+v.j,0);if(sj>=7)base=h.reduce((s,v)=>s+v.d,0)/sj;
  if(c.seuil_jour_m3!=null&&L.cj>+c.seuil_jour_m3)al.push(`${fm3(L.cj)} m³/j > seuil ${fm3(c.seuil_jour_m3)}`);
  if(base!=null){if(base>0?(L.cj>c.coef_alerte*base&&L.cj-base>=.05):L.cj>=.2)al.push(base>0?`×${(L.cj/base).toLocaleString("fr-FR",{maximumFractionDigits:1})} la moyenne`:"consommation inhabituelle")}}
 if(c.delai_releve_j&&lastR&&(Date.now()-new Date(lastR.releve_at))/864e5>c.delai_releve_j)al.push(`aucun relevé depuis ${Math.floor((Date.now()-new Date(lastR.releve_at))/864e5)} j`);
 if(c.delai_releve_j&&!lastR&&(Date.now()-new Date(c.created_at))/864e5>c.delai_releve_j)al.push("aucun relevé");
 const vr=all.filter(r=>r.statut==="a_verifier"),nf=vr.filter(r=>/anormale/.test(r.motif||"")).length,nb=vr.length-nf;if(nf)al.unshift(`⚠ fuite suspectée : ${nf} relevé(s) à contrôler`);if(nb)al.push(`${nb} relevé(s) inférieur(s) à contrôler`);
 return{c,lastR,cj:L?L.cj:null,base,ecart:L&&base>0?(L.cj/base-1)*100:null,al,iv,pts,def:c.actif&&(vr.length>0||al.some(t=>/seuil|moyenne|inhabituelle/.test(t)))}}
function renderCp(){const ok=CPOK(),inAdm=!$("ad").classList.contains("hide");
 $("tabc").classList.toggle("hide",!ok);$("tabc").classList.toggle("sec",tab!=="c");$("cv").classList.toggle("hide",inAdm||tab!=="c"||!ok);
 if(ok&&!CPL){loadCp();return}
 if(ok&&!CPERR){const nd=CP.map(cpStats).filter(s=>s.def).length;$("tabc").classList.toggle("alrt",nd>0);$("cpbdg").textContent=nd?nd:"";$("tabc").title=nd?`Compteurs d'eau : ${nd} compteur(s) en défaut`:"Compteurs d'eau"}
 if(!ok||tab!=="c"||inAdm)return;
 ["cp_new","cp_qr"].forEach(i=>$(i).classList.toggle("hide",!canCp()));
 const sv=$("cp_s").value;$("cp_s").innerHTML=sOpts("Tous les sites");$("cp_s").value=sv;
 if(CPERR){$("cpbody").innerHTML=`<p class="empty">${esc(CPERR)}</p>`;return}
 const q=$("cp_q").value.trim().toLowerCase(),onlyA=$("cp_a").checked;
 let st=CP.filter(c=>(!sv||c.site_id==sv)&&(!q||[c.nom,c.ref_concessionnaire,c.local].join(" ").toLowerCase().includes(q))).map(cpStats);
 const nA=st.filter(s=>s.al.length&&s.c.actif).length;if(onlyA)st=st.filter(s=>s.al.length);
 $("cp_n").textContent=`${st.length} compteur(s)${nA?` · ${nA} en alerte`:""}`;
 TB.c.base=st;const list=sortFilt(st,"c");
 if(!list.length){$("cpbody").innerHTML=`<p class="empty">${CP.length?"Aucun compteur ne correspond à ces filtres.":"Aucun compteur enregistré."}</p>`;return}
 const g={};list.forEach(s=>(g[s.c.site_id]=g[s.c.site_id]||[]).push(s));const many=list.length>60,srt=!!TB.c.s.k;
 $("cpbody").innerHTML=Object.keys(g).sort((a,b)=>siteN(a).localeCompare(siteN(b),"fr")).map(sid=>{const rows=srt?g[sid]:g[sid].sort((a,b)=>(b.al.length>0)-(a.al.length>0)||a.c.nom.localeCompare(b.c.nom,"fr",{numeric:true})),na=rows.filter(s=>s.al.length&&s.c.actif).length;
  return`<details class="cpg"${!many||na||sv?" open":""}><summary><b>${esc(siteN(sid))}</b> — ${rows.length} compteur(s)${na?` · <span class="off">${na} alerte(s)</span>`:""}</summary><div class="table"><table class="rt" data-tb="c" style="width:${tw("c")}px"><colgroup>${colsHtml("c")}</colgroup><thead><tr>${thHtml("c")}</tr></thead><tbody>${rows.map(s=>rowH("c",s,s.c.actif?"":"arc",`data-cp="${s.c.id}"`)).join("")}</tbody></table></div></details>`}).join("")}
// --- fiche d'un compteur
function cpChart(s){const W=720,H=170,t1=Date.now(),t0=t1-CPD*864e5,iv=s.iv.filter(v=>v.t1>=t0);if(!iv.length)return'<p class="empty">Pas assez de relevés sur la période pour tracer une consommation.</p>';
 const c=s.c,mx=Math.max(...iv.map(v=>v.cj),+c.seuil_jour_m3||0,(s.base||0)*c.coef_alerte,.1)*1.15,X=t=>40+(Math.max(t,t0)-t0)/(t1-t0)*(W-50),Y=v=>H-22-v/mx*(H-34);
 let o=`<svg viewBox="0 0 ${W} ${H}" class="cpch" role="img" aria-label="Consommation par jour"><line x1="40" y1="${H-22}" x2="${W-10}" y2="${H-22}" stroke="#999"/>`+
 iv.map(v=>{const bad=(c.seuil_jour_m3!=null&&v.cj>+c.seuil_jour_m3)||(s.base>0&&v.cj>c.coef_alerte*s.base&&v.cj-s.base>=.05);return`<rect x="${X(v.t0)}" y="${Y(v.cj)}" width="${Math.max(2,X(v.t1)-X(v.t0)-1)}" height="${H-22-Y(v.cj)}" fill="${bad?"#b3261e":"#102d69"}" opacity=".8"><title>${fdate(v.t0)} → ${fdate(v.t1)} : ${fm3(v.cj)} m³/j</title></rect>`}).join("");
 if(s.base>0)o+=`<line x1="40" x2="${W-10}" y1="${Y(s.base)}" y2="${Y(s.base)}" stroke="#2f7d4f" stroke-dasharray="4 3"/><text x="44" y="${Y(s.base)-3}" font-size="10" fill="#2f7d4f">moyenne ${fm3(s.base)}</text>`;
 if(c.seuil_jour_m3!=null)o+=`<line x1="40" x2="${W-10}" y1="${Y(+c.seuil_jour_m3)}" y2="${Y(+c.seuil_jour_m3)}" stroke="#b3261e" stroke-dasharray="4 3"/><text x="44" y="${Y(+c.seuil_jour_m3)-3}" font-size="10" fill="#b3261e">seuil ${fm3(c.seuil_jour_m3)}</text>`;
 return o+`<text x="36" y="14" text-anchor="end" font-size="10">${fm3(mx)}</text><text x="36" y="${H-22}" text-anchor="end" font-size="10">0</text><text x="40" y="${H-6}" font-size="10">${fdate(t0)}</text><text x="${W-10}" y="${H-6}" text-anchor="end" font-size="10">${fdate(t1)}</text></svg><div class="mute" style="font-size:12px">m³ par jour, par intervalle entre deux relevés.</div>`}
function cpDetail(id){const c=CP.find(x=>x.id==id);if(!c)return;CPCUR=c.id;const s=cpStats(c),m=gmap(c),rl=RL.filter(r=>r.compteur_id==c.id).slice().reverse();
 const tl=rl.slice(0,60).map(r=>{const prev=RL.filter(p=>p.compteur_id==c.id&&p.statut==="valide"&&(p.releve_at<r.releve_at||(p.releve_at===r.releve_at&&p.id<r.id))).pop(),dl=prev&&r.index_m3>=prev.index_m3?fm3(r.index_m3-prev.index_m3):"—",ap=APP.find(a=>a.appareil_id===r.appareil_id);
  return`<tr class="${r.statut==="rejete"?"arc":""}"><td>${fdh(r.releve_at)}</td><td class="num">${fm3(r.index_m3)}</td><td class="num">${dl}</td><td>${esc(r.auteur_nom||(r.source==="manuel"?"saisie manuelle":"—"))}</td><td title="${esc(r.appareil_id||"")}">${r.appareil_id?esc(r.appareil_id.slice(0,6)):"—"}${ap&&ap.statut!=="inconnu"?` <span class="tag ${ap.statut==="fiable"?"s-resolue":"p-urgente"}">${ap.statut}</span>`:""}</td><td>${r.statut==="valide"?"":r.statut==="rejete"?`<span class="tag p-urgente" title="${esc(r.motif||"")}">rejeté</span>`:`<span class="tag" style="background:var(--bad);color:#fff;border-color:var(--bad);font-weight:700">À VÉRIFIER</span><div style="color:var(--bad);font-size:12px;font-weight:600;white-space:normal">${esc(r.motif||"")}</div>`}</td><td>${canCp()?(r.statut==="valide"?`<button class="sec" data-rr="${r.id}" data-to="rejete">Rejeter</button>`:`<button class="sec" data-rr="${r.id}" data-to="valide">${r.statut==="rejete"?"Rétablir":"Valider"}</button>${r.statut==="a_verifier"?`<button class="sec" data-rr="${r.id}" data-to="rejete">Rejeter</button>`:""}`):""}</td></tr>`}).join("");
 $("cpd").innerHTML=`<h2 style="margin-top:0;padding-right:38px">${esc(c.nom)}${c.actif?"":" (inactif)"}</h2><p class="mute">${esc(siteN(c.site_id))}${c.zone_id?" · "+esc(zoneN(c.zone_id)):""}${c.local?" · "+esc(c.local):""}${c.ref_concessionnaire?" · réf. "+esc(c.ref_concessionnaire):""}${m?` · <a href="${m}" target="_blank" rel="noopener noreferrer">Voir sur Google Maps</a>`:""}</p>
 ${s.al.length?`<p class="msg">⚠ ${esc(s.al.join(" ; "))}</p>`:""}
 <div class="row dper" style="margin:8px 0">${[30,90,180,365].map(d=>`<button class="${CPD===d?"":"sec"}" data-cpd="${d}">${d} j</button>`).join("")}</div>${cpChart(s)}
 ${canCp()?`<div class="row" style="margin:12px 0;align-items:end"><div><label for="cpx">Saisie manuelle d'un index (m³)</label><input id="cpx" inputmode="decimal" placeholder="ex. 12345,6"></div><div><label for="cpt">Date et heure</label><input id="cpt" type="datetime-local"></div><button id="cpxb" style="flex:0 0 auto">Ajouter</button></div><div id="cpxm" class="msg"></div>`:""}
 <div class="table"><table class="cpt"><thead><tr><th>Date</th><th class="num">Index (m³)</th><th class="num">Conso (m³)</th><th>Auteur</th><th>Appareil</th><th>Statut</th><th></th></tr></thead><tbody>${tl||'<tr><td colspan="7" class="empty">Aucun relevé.</td></tr>'}</tbody></table></div>
 <div class="row xfoot">${canCp()?'<button type="button" class="sec" id="cpedit">Modifier le compteur / QR code</button>':""}<button type="button" class="sec" data-close>Fermer</button></div>`;
 if(canCp()){const d=new Date(Date.now()-new Date().getTimezoneOffset()*6e4);$("cpt").value=d.toISOString().slice(0,16);
  $("cpedit").onclick=()=>cpEdit(c.id);
  $("cpxb").onclick=async()=>{const v=parseFloat($("cpx").value.replace(/\s/g,"").replace(",","."));if(!isFinite(v)||v<0){$("cpxm").textContent="Index invalide.";return}
   const at=new Date($("cpt").value||Date.now()),lp=s.pts[s.pts.length-1],last=lp?lp.x:null,low=last!=null&&v<last;let hi=null;
   if(lp&&!low){const rate=(v-lp.x)/Math.max((at-lp.t)/864e5,.5),w=s.pts.filter(p=>p.t>at-60*864e5),sp=w.length>1?(w[w.length-1].t-w[0].t)/864e5:0,bs=sp>=7?(w[w.length-1].x-w[0].x)/sp:null;
    if((c.seuil_jour_m3!=null&&rate>+c.seuil_jour_m3)||(bs!=null&&rate>c.coef_alerte*bs&&rate-bs>=.05))hi=`Consommation anormale : ${fm3(rate)} m³/j`+(c.seuil_jour_m3!=null&&rate>+c.seuil_jour_m3?` (seuil ${fm3(c.seuil_jour_m3)})`:` (moyenne habituelle ${fm3(bs)})`)}
   if(low&&!confirm(`L'index (${fm3(v)}) est inférieur au dernier relevé valide (${fm3(last)}). L'enregistrer « à vérifier » ?`))return;
   if(hi&&!confirm(`⚠ FUITE SUSPECTÉE : ${hi}.\n\nL'enregistrer au statut « à vérifier » ?`))return;
   const {error}=await sb.from("releves_compteur").insert({compteur_id:c.id,index_m3:v,releve_at:new Date($("cpt").value||Date.now()).toISOString(),source:"manuel",auteur_nom:nm(),saisi_par:me.id,statut:low||hi?"a_verifier":"valide",motif:low?"Index inférieur au précédent ("+fm3(last)+")":hi});
   if(error){$("cpxm").textContent=errMsg(error);return}await loadCp();cpDetail(c.id)}}
 if(!$("dCp").open)$("dCp").showModal()}
// --- création / modification
function cpEdit(id){const c=id?CP.find(x=>x.id==id):null;CPE=c?c.id:null;$("dCp").close();
 $("ce_t").textContent=c?"Modifier le compteur":"Nouveau compteur";$("ce_s").innerHTML=sOpts();$("ce_s").value=c?c.site_id:($("cp_s").value||(sites[0]||{}).id||"");
 const zf=()=>{$("ce_z").innerHTML=tOpts($("ce_s").value,"— Aucune —")};zf();$("ce_s").onchange=zf;if(c&&c.zone_id)$("ce_z").value=c.zone_id;
 const v=(k,d="")=>c&&c[k]!=null?c[k]:d;$("ce_n").value=v("nom");$("ce_r").value=v("ref_concessionnaire");$("ce_l").value=v("local");$("ce_la").value=v("latitude");$("ce_lo").value=v("longitude");
 $("ce_se").value=v("seuil_jour_m3");$("ce_co").value=v("coef_alerte",2);$("ce_de").value=v("delai_releve_j");$("ce_no").value=v("notes");$("ce_a").checked=c?c.actif:true;$("ce_m").textContent="";
 $("ce_qr").classList.toggle("hide",!c);$("ce_del").classList.toggle("hide",!c||role()!=="admin");
 if(c){$("ce_qrs").innerHTML=QR.svg(cpUrl(c),150);$("ce_url").value=cpUrl(c);$("ce_mp").innerHTML=gmap(c)?`<a href="${gmap(c)}" target="_blank" rel="noopener noreferrer">Voir sur Google Maps</a>`:""}
 $("dCe").showModal()}
const num=s=>{s=String(s).trim().replace(",",".");return s===""?null:(isFinite(+s)?+s:NaN)};
$("ce_f").onsubmit=async e=>{e.preventDefault();const la=num($("ce_la").value),lo=num($("ce_lo").value),se=num($("ce_se").value),co=num($("ce_co").value),de=num($("ce_de").value);
 if([la,lo,se,co,de].some(Number.isNaN)){$("ce_m").textContent="Un des champs numériques est invalide.";return}
 if((la==null)!==(lo==null)){$("ce_m").textContent="Renseignez la latitude ET la longitude (ou aucune des deux).";return}
 const row={site_id:$("ce_s").value,zone_id:$("ce_z").value||null,nom:$("ce_n").value.trim(),ref_concessionnaire:$("ce_r").value.trim()||null,local:$("ce_l").value.trim()||null,latitude:la,longitude:lo,seuil_jour_m3:se,coef_alerte:co||2,delai_releve_j:de,notes:$("ce_no").value.trim()||null,actif:$("ce_a").checked};
 const {error}=CPE?await sb.from("compteurs").update(row).eq("id",CPE):await sb.from("compteurs").insert(row);
 if(error){$("ce_m").textContent=/duplicate|unique/i.test(error.message)?"Un compteur de ce nom existe déjà sur ce site.":errMsg(error);return}
 $("dCe").close();await loadCp()};
$("ce_geo").onclick=()=>{if(!navigator.geolocation){$("ce_m").textContent="Géolocalisation indisponible sur cet appareil.";return}$("ce_m").textContent="Recherche de la position…";
 navigator.geolocation.getCurrentPosition(p=>{$("ce_la").value=p.coords.latitude.toFixed(6);$("ce_lo").value=p.coords.longitude.toFixed(6);$("ce_m").textContent=""},()=>{$("ce_m").textContent="Position refusée ou introuvable."},{enableHighAccuracy:true,timeout:15000})};
$("ce_cp").onclick=async()=>{try{await navigator.clipboard.writeText($("ce_url").value);$("ce_m").style.color="var(--ok)";$("ce_m").textContent="Lien copié."}catch(e){$("ce_url").select()}};
$("ce_re").onclick=async()=>{if(!CPE||!confirm("Régénérer le QR code ? Les QR déjà imprimés et collés ne fonctionneront plus."))return;
 const b=new Uint8Array(10);crypto.getRandomValues(b);const t=Array.from(b,x=>x.toString(16).padStart(2,"0")).join("");const {error}=await sb.from("compteurs").update({token:t}).eq("id",CPE);
 if(error){$("ce_m").textContent=errMsg(error);return}await loadCp();cpEdit(CPE)};
$("ce_pr").onclick=()=>{const c=CP.find(x=>x.id==CPE);if(c)cpPrint([c])};
$("ce_del").onclick=async()=>{const c=CP.find(x=>x.id==CPE);if(!c||!confirm(`Supprimer définitivement « ${c.nom} » et tous ses relevés ?`))return;const {error}=await sb.from("compteurs").delete().eq("id",c.id);if(error){$("ce_m").textContent=errMsg(error);return}$("dCe").close();await loadCp()};
// --- planche de QR codes à imprimer
function cpPrint(list){if(!list.length){alert("Aucun compteur à imprimer.");return}
 const L=list.map(c=>`<div class="e"><div class="s">${esc(siteN(c.site_id))}</div>${QR.svg(cpUrl(c),170)}<div class="n">${esc(c.nom)}</div><div class="l">${esc([c.zone_id?zoneN(c.zone_id):"",c.local].filter(Boolean).join(" · "))}</div><div class="r">${esc(c.ref_concessionnaire||"")}</div><div class="t">Scannez pour saisir l'index du compteur</div></div>`).join("");
 const h=`<!doctype html><meta charset="utf-8"><title>QR compteurs</title><style>body{font-family:system-ui,sans-serif;margin:12px}.g{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.e{border:1px dashed #888;padding:8px;text-align:center;break-inside:avoid}.s{font-size:11px;color:#555}.n{font-weight:700}.l,.r{font-size:12px}.t{font-size:11px;color:#555;margin-top:4px}button{margin-bottom:10px;padding:8px 14px}@media print{button{display:none}}</style><button onclick="print()">Imprimer</button><div class="g">${L}</div>`;
 window.open(URL.createObjectURL(new Blob([h],{type:"text/html"})),"_blank","noopener,noreferrer")}
// --- appareils (liste de confiance / liste noire)
function cpApp(){const ro=!canCp();$("cpa").innerHTML=(APP.length?`<table class="cpt"><thead><tr><th>Appareil</th><th>Libellé</th><th>Statut</th><th class="num">Relevés</th><th class="num">Rejets</th><th>Dernière activité</th></tr></thead><tbody>`+
 APP.slice().sort((a,b)=>b.nb_rejets-a.nb_rejets||(b.derniere_vue>a.derniere_vue?1:-1)).map(a=>`<tr><td title="${esc(a.appareil_id)}">${esc(a.appareil_id.slice(0,8))}</td><td><input data-al="${esc(a.appareil_id)}" value="${esc(a.libelle||"")}" placeholder="ex. téléphone agent Dupont"${ro?" disabled":""}></td><td><select data-as="${esc(a.appareil_id)}"${ro?" disabled":""}>${[["inconnu","Inconnu"],["fiable","Fiable"],["bloque","Bloqué"]].map(([k,l])=>`<option value="${k}"${a.statut===k?" selected":""}>${l}</option>`).join("")}</select></td><td class="num">${a.nb_releves}</td><td class="num">${a.nb_rejets}</td><td>${fdh(a.derniere_vue)}</td></tr>`).join("")+"</tbody></table>":'<p class="empty">Aucun appareil enregistré pour l\'instant.</p>');
 if(!$("dAp").open)$("dAp").showModal()}
$("cpa").onchange=async e=>{const t=e.target,id=t.dataset.as||t.dataset.al;if(!id)return;const {error}=await sb.from("appareils_compteur").update(t.dataset.as?{statut:t.value}:{libelle:t.value.trim()||null}).eq("appareil_id",id);
 if(error){alert(errMsg(error));return}const a=APP.find(x=>x.appareil_id===id);if(a){if(t.dataset.as)a.statut=t.value;else a.libelle=t.value.trim()||null}};
// --- branchements
$("tabc").onclick=()=>{tab="c";render();loadCp()};setInterval(()=>{if(CPOK()&&CPL)loadCp()},6e5);
["cp_s","cp_a"].forEach(i=>$(i).onchange=renderCp);$("cp_q").oninput=renderCp;$("cp_r").onclick=loadCp;$("colc").onclick=e=>openCols("c",e.currentTarget);$("cpbody").addEventListener("click",hdClick("c"));$("cp_new").onclick=()=>cpEdit(null);$("cp_ap").onclick=cpApp;
$("cp_qr").onclick=()=>{const sv=$("cp_s").value;cpPrint(CP.filter(c=>c.actif&&(!sv||c.site_id==sv)))};
$("cpbody").addEventListener("click",e=>{if(e.target.closest("button.hb,button.hf,.rs"))return;const tr=e.target.closest("tr[data-cp]");if(tr)cpDetail(tr.dataset.cp)});
$("cpd").onclick=async e=>{const d=e.target.closest("[data-cpd]");if(d){CPD=+d.dataset.cpd;cpDetail(CPCUR);return}
 const b=e.target.closest("[data-rr]");if(!b)return;let motif=null;if(b.dataset.to==="rejete"){motif=prompt("Motif du rejet (facultatif) :");if(motif===null)return}
 const {error}=await sb.from("releves_compteur").update({statut:b.dataset.to,motif:motif||null}).eq("id",b.dataset.rr);if(error){alert(errMsg(error));return}await loadCp();cpDetail(CPCUR)};
start();
(function(){var b=document.getElementById("boot");if(b)b.remove()})();
