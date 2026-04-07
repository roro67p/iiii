// APP RESERVATION PRO — Chez Romu — Version finale

var CONFIG = {
  NOM: "Chez Romu",
  ADRESSE: "Route de chez Romu",
  TEL: "04 72 00 00 00",
  EMAIL_PRO: "",
  EMOJI: "💈",
  DUREE: 30,
  HEURE_DEBUT: "09:00",
  HEURE_FIN: "19:00",
  MOT_DE_PASSE: "salon2026",
  SERVICES: [
    { nom: "Coupe homme", duree: 30, prix: 20, new: false },
    { nom: "Coupe femme", duree: 45, prix: 35, new: false },
    { nom: "Barbe", duree: 20, prix: 15, new: false },
    { nom: "Coupe et Barbe", duree: 50, prix: 30, new: false },
    { nom: "Coloration", duree: 90, prix: 65, new: false },
    { nom: "Brushing", duree: 30, prix: 25, new: false },
    { nom: "Massage", duree: 60, prix: 45, new: true }
  ],
  COIFFEUSES: ["Biniouf", "Remilienne"]
};

function doGet(e) {
  var page = e.parameter.page || "home";
  if (page === "creneaux") return getCreneaux(e);
  if (page === "confirmer") return confirmerRDV(e);
  if (page === "admin") return showAdmin(e);
  if (page === "annuler") return annulerRDV(e);
  if (page === "saveajout") return saveAjout(e);
  if (page === "editcoiff") return editCoiff(e);
  if (page === "savecoiff") return saveCoiff(e);
  if (page === "ajoutcoiff") return ajoutCoiff(e);
  if (page === "saveajoutcoiff") return saveAjoutCoiff(e);
  if (page === "fournisseurs") return showFournisseurs(e);
  if (page === "savefournisseur") return saveFournisseur(e);
  if (page === "commandes") return showCommandes(e);
  if (page === "savecommande") return saveCommande(e);
  return showHome();
}

function timeToMin(t) {
  var p = t.split(":");
  return parseInt(p[0]) * 60 + parseInt(p[1]);
}

function minToTime(m) {
  var h = Math.floor(m / 60), mn = m % 60;
  return (h < 10 ? "0" : "") + h + ":" + (mn < 10 ? "0" : "") + mn;
}

function getTomorrow() {
  var d = new Date(); d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

function getMaxDate() {
  var d = new Date(); d.setDate(d.getDate() + 60);
  return d.toISOString().split("T")[0];
}

function getWS() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ws = ss.getSheetByName("RDV");
  if (!ws) {
    ws = ss.insertSheet("RDV");
    ws.getRange(1, 1, 1, 11).setValues([["ID","Date","Heure","Client","Tel","Email","Service","Prix","Duree","Statut","Coiffeuse"]]);
  }
  return ws;
}

function getWSCoiff() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ws = ss.getSheetByName("Coiffeuses");
  if (!ws) {
    ws = ss.insertSheet("Coiffeuses");
    ws.getRange(1, 1, 1, 5).setValues([["Nom","Debut","Fin","Conges","Prime"]]);
    ws.appendRow(["Biniouf","09:00","19:00","",0]);
    ws.appendRow(["Remilienne","09:00","19:00","",0]);
  }
  return ws;
}

function getWSFournisseurs() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ws = ss.getSheetByName("Fournisseurs");
  if (!ws) {
    ws = ss.insertSheet("Fournisseurs");
    ws.getRange(1,1,1,5).setValues([["Nom","Produits","Tel","Email","Notes"]]);
  }
  return ws;
}

function getWSCommandes() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ws = ss.getSheetByName("Commandes");
  if (!ws) {
    ws = ss.insertSheet("Commandes");
    ws.getRange(1,1,1,6).setValues([["Date","Fournisseur","Produit","Quantite","Prix EU","Statut"]]);
  }
  return ws;
}

function getRDVs() {
  var ws = getWS();
  if (ws.getLastRow() < 2) return [];
  var vals = ws.getRange(2, 1, ws.getLastRow() - 1, 11).getValues();
  return vals.map(function(r) {
    if (r[1] instanceof Date) {
      r[1] = Utilities.formatDate(r[1], "Europe/Paris", "yyyy-MM-dd");
    } else {
      r[1] = String(r[1]).substring(0, 10);
    }
    if (r[2] instanceof Date) {
      r[2] = Utilities.formatDate(r[2], "Europe/Paris", "HH:mm");
    } else {
      r[2] = String(r[2]).substring(0, 5);
    }
    return r;
  });
}

function getCoiffData() {
  var ws = getWSCoiff();
  var data = {};
  if (ws.getLastRow() > 1) {
    var vals = ws.getRange(2, 1, ws.getLastRow() - 1, 5).getValues();
    vals.forEach(function(r) {
      data[r[0]] = { debut: r[1], fin: r[2], conges: r[3], prime: r[4] };
    });
  }
  return data;
}

function getSvcColor(svc) {
  var s = String(svc).toLowerCase();
  if (s.indexOf("coupe et barbe") > -1) return "#8B5CF6";
  if (s.indexOf("coupe homme") > -1) return "#3B82F6";
  if (s.indexOf("coupe femme") > -1) return "#EC4899";
  if (s.indexOf("barbe") > -1) return "#F59E0B";
  if (s.indexOf("coloration") > -1) return "#EF4444";
  if (s.indexOf("brushing") > -1) return "#10B981";
  return "#6366F1";
}

function getCreneaux(e) {
  var date = e.parameter.date;
  var duree = parseInt(e.parameter.duree) || CONFIG.DUREE;
  var rdvs = getRDVs();
  var pris = [];
  rdvs.forEach(function(r) {
    if (r[1] === date && r[9] !== "Annule") {
      pris.push({ heure: r[2], duree: parseInt(r[8]) || 30 });
    }
  });
  var creneaux = [];
  var debut = timeToMin(CONFIG.HEURE_DEBUT);
  var fin = timeToMin(CONFIG.HEURE_FIN);
  for (var t = debut; t + duree <= fin; t += CONFIG.DUREE) {
    var h = minToTime(t), ok = true;
    pris.forEach(function(p) {
      var ps = timeToMin(p.heure), pe = ps + p.duree;
      if (t < pe && t + duree > ps) ok = false;
    });
    if (ok) creneaux.push(h);
  }
  return ContentService.createTextOutput(JSON.stringify({ creneaux: creneaux }))
    .setMimeType(ContentService.MimeType.JSON);
}

function confirmerRDV(e) {
  var ws = getWS();
  var id = "RDV-" + ws.getLastRow().toString().padStart(4, "0");
  var coiffeuse = e.parameter.coiffeuse || "Pas de preference";
  ws.appendRow([id, e.parameter.date, e.parameter.heure, e.parameter.nom,
    e.parameter.tel, e.parameter.email || "", e.parameter.service,
    e.parameter.prix, e.parameter.duree, "Confirme", coiffeuse]);
  if (e.parameter.email && e.parameter.email.indexOf("@") > 0) {
    try {
      MailApp.sendEmail(e.parameter.email, "Votre RDV est confirme - " + CONFIG.NOM,
        "Bonjour " + e.parameter.nom + ",\n\n" +
        "C est avec plaisir que nous confirmons votre rendez-vous !\n\n" +
        "━━━━━━━━━━━━━━━━━━━━━━\n" +
        "Date      : " + e.parameter.date + "\n" +
        "Heure     : " + e.parameter.heure + "\n" +
        "Service   : " + e.parameter.service + "\n" +
        "Coiffeuse : " + coiffeuse + "\n" +
        "Prix      : " + e.parameter.prix + " EU\n" +
        "━━━━━━━━━━━━━━━━━━━━━━\n\n" +
        "Nous vous attendons au " + CONFIG.ADRESSE + "\n" +
        "Pour toute question : " + CONFIG.TEL + "\n\n" +
        "A bientot !\n" +
        "L equipe " + CONFIG.NOM);
    } catch (err) {}
  }
  return HtmlService.createHtmlOutput(getConfirmPage(e.parameter, id))
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function annulerRDV(e) {
  var url = ScriptApp.getService().getUrl();
  if (e.parameter.pwd !== CONFIG.MOT_DE_PASSE) {
    return HtmlService.createHtmlOutput("<p>Erreur mot de passe</p><a href='" + url + "?page=admin&pwd=" + e.parameter.pwd + "'>Retour</a>")
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  var ws = getWS(), vals = ws.getDataRange().getValues();
  for (var i = 1; i < vals.length; i++) {
    if (vals[i][0] === e.parameter.id) {
      ws.getRange(i + 1, 10).setValue("Annule");
      return HtmlService.createHtmlOutput("<p>RDV annule</p><a href='" + url + "?page=admin&pwd=" + e.parameter.pwd + "'>Retour</a>")
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }
  }
  return HtmlService.createHtmlOutput("<p>RDV introuvable</p>")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function saveAjout(e) {
  var url = ScriptApp.getService().getUrl();
  if (e.parameter.pwd !== CONFIG.MOT_DE_PASSE) {
    return HtmlService.createHtmlOutput("<p>Erreur</p>").setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  var ws = getWS();
  var id = "RDV-" + ws.getLastRow().toString().padStart(4, "0");
  ws.appendRow([id, e.parameter.date, e.parameter.heure, e.parameter.nom,
    e.parameter.tel, "", e.parameter.service, e.parameter.prix || 0, 30, "Confirme",
    e.parameter.coiffeuse || "Pas de preference"]);
  return HtmlService.createHtmlOutput("<p>RDV " + id + " cree !</p><a href='" + url + "?page=admin&pwd=" + e.parameter.pwd + "'>Retour admin</a>")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function editCoiff(e) {
  var url = ScriptApp.getService().getUrl();
  if (e.parameter.pwd !== CONFIG.MOT_DE_PASSE) return HtmlService.createHtmlOutput("<p>Erreur</p>").setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  var nom = e.parameter.nom;
  var data = getCoiffData();
  var d = data[nom] || { debut: "09:00", fin: "19:00", conges: "", prime: 0 };
  var coiffEmojis = { "Biniouf": "💇", "Remilienne": "💅" };
  var emoji = coiffEmojis[nom] || "💇";

  var html = '<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta charset="UTF-8">'
    + '<style>'
    + '*{margin:0;padding:0;box-sizing:border-box}'
    + 'body{font-family:sans-serif;background:#0A0A0F;color:#fff}'
    + '.hdr{background:linear-gradient(135deg,#6366F1,#4F46E5);padding:16px;display:flex;align-items:center;gap:12px}'
    + '.avatar{width:44px;height:44px;background:rgba(255,255,255,.2);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:22px}'
    + '.hdr h1{font-size:17px;font-weight:700}'
    + '.ct{padding:16px}'
    + '.section{background:#1a1a2e;border-radius:14px;padding:16px;margin-bottom:12px;border:1px solid #21213A}'
    + '.stitle{font-size:11px;font-weight:700;color:#6366F1;text-transform:uppercase;letter-spacing:1px;margin-bottom:14px}'
    + 'label{display:block;font-size:11px;color:#888;text-transform:uppercase;margin-bottom:6px;margin-top:12px}'
    + 'label:first-child{margin-top:0}'
    + 'input,select{width:100%;padding:13px;background:#111;border:1.5px solid #21213A;border-radius:10px;color:#fff;font-size:15px;font-family:sans-serif}'
    + '.row2{display:grid;grid-template-columns:1fr 1fr;gap:10px}'
    + '.jours{display:grid;grid-template-columns:repeat(7,1fr);gap:6px}'
    + '.j{padding:10px 0;border:1.5px solid #21213A;border-radius:8px;background:#111;color:#888;font-size:12px;font-weight:600;cursor:pointer;text-align:center;font-family:sans-serif;transition:all .2s}'
    + '.j.on{background:#6366F1;border-color:#6366F1;color:#fff}'
    + '.btn{width:100%;padding:15px;background:#6366F1;color:#fff;border:none;border-radius:10px;font-size:16px;font-weight:700;cursor:pointer;margin-top:6px;font-family:sans-serif}'
    + '.btn2{display:block;text-align:center;padding:13px;background:#1a1a2e;color:#888;border-radius:10px;font-size:14px;text-decoration:none;margin-top:10px;border:1px solid #21213A}'
    + '.safe{height:30px}'
    + '</style></head><body>'
    + '<div class="hdr"><div class="avatar">' + emoji + '</div><h1>Modifier ' + nom + '</h1></div>'
    + '<div class="ct">'
    + '<form action="' + url + '" method="get">'
    + '<input type="hidden" name="page" value="savecoiff">'
    + '<input type="hidden" name="pwd" value="' + e.parameter.pwd + '">'
    + '<input type="hidden" name="nom" value="' + nom + '">'
    + '<input type="hidden" name="jours_off" id="jours_off_input" value="">'

    // Horaires
    + '<div class="section">'
    + '<div class="stitle">⏰ Horaires de travail</div>'
    + '<div class="row2">'
    + '<div><label>Debut</label><input type="time" name="debut" value="' + d.debut + '"></div>'
    + '<div><label>Fin</label><input type="time" name="fin" value="' + d.fin + '"></div>'
    + '</div></div>'

    // Jours repos
    + '<div class="section">'
    + '<div class="stitle">😴 Jours de repos (chaque semaine)</div>'
    + '<div class="jours">'
    + '<button type="button" class="j" id="jLun" data-j="Lun" onclick="tJ(this)">Lun</button>'
    + '<button type="button" class="j" id="jMar" data-j="Mar" onclick="tJ(this)">Mar</button>'
    + '<button type="button" class="j" id="jMer" data-j="Mer" onclick="tJ(this)">Mer</button>'
    + '<button type="button" class="j" id="jJeu" data-j="Jeu" onclick="tJ(this)">Jeu</button>'
    + '<button type="button" class="j" id="jVen" data-j="Ven" onclick="tJ(this)">Ven</button>'
    + '<button type="button" class="j" id="jSam" data-j="Sam" onclick="tJ(this)">Sam</button>'
    + '<button type="button" class="j" id="jDim" data-j="Dim" onclick="tJ(this)">Dim</button>'
    + '</div></div>'

    // Conges ponctuels
    + '<div class="section">'
    + '<div class="stitle">📅 Conges ponctuels</div>'
    + '<label>Dates (ex: 2026-04-15, 2026-04-20)</label>'
    + '<input type="text" name="jours" placeholder="2026-04-15, 2026-04-20">'
    + '</div>'

    // Vacances
    + '<div class="section">'
    + '<div class="stitle">🏖 Vacances</div>'
    + '<div class="row2">'
    + '<div><label>Du</label><input type="date" name="vac_debut"></div>'
    + '<div><label>Au</label><input type="date" name="vac_fin"></div>'
    + '</div></div>'

    // Prime
    + '<div class="section">'
    + '<div class="stitle">💰 Prime</div>'
    + '<label>Montant EU</label>'
    + '<input type="number" name="prime" value="' + d.prime + '" placeholder="0">'
    + '</div>'

    + '<button type="submit" class="btn">✅ Enregistrer</button>'
    + '</form>'
    + '<a href="' + url + '?page=admin&pwd=' + e.parameter.pwd + '" class="btn2">Retour sans sauvegarder</a>'
    + '<div class="safe"></div>'
    + '</div>'

    + '<script>'
    + 'var offs=[];'
    + 'function tJ(el){'
    + '  var j=el.getAttribute("data-j");'
    + '  if(el.classList.contains("on")){el.classList.remove("on");offs=offs.filter(function(x){return x!==j;});}'
    + '  else{el.classList.add("on");offs.push(j);}'
    + '  document.getElementById("jours_off_input").value=offs.join(",");'
    + '}'
    + '</script>'
    + '</body></html>';

  return HtmlService.createHtmlOutput(html).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function saveCoiff(e) {
  try {
    var url = ScriptApp.getService().getUrl();
    if (e.parameter.pwd !== CONFIG.MOT_DE_PASSE) {
      return HtmlService.createHtmlOutput("<p>Erreur pwd</p>").setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }
    var nom = e.parameter.nom || "";
    var debut = e.parameter.debut || "09:00";
    var fin = e.parameter.fin || "19:00";
    var prime = parseFloat(e.parameter.prime) || 0;
    var conges = "";
    if (e.parameter.jours_off) conges += "Repos:" + e.parameter.jours_off + " ";
    if (e.parameter.jours) conges += "Conges:" + e.parameter.jours + " ";
    if (e.parameter.vac_debut && e.parameter.vac_fin) conges += "Vacances:" + e.parameter.vac_debut + "-" + e.parameter.vac_fin;

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var ws = ss.getSheetByName("Coiffeuses");
    if (!ws) {
      ws = ss.insertSheet("Coiffeuses");
      ws.getRange(1,1,1,5).setValues([["Nom","Debut","Fin","Conges","Prime"]]);
      ws.appendRow(["Biniouf","09:00","19:00","",0]);
      ws.appendRow(["Remilienne","09:00","19:00","",0]);
    }
    var vals = ws.getDataRange().getValues();
    var found = false;
    for (var i = 1; i < vals.length; i++) {
      if (String(vals[i][0]) === nom) {
        ws.getRange(i+1,2).setValue(debut);
        ws.getRange(i+1,3).setValue(fin);
        ws.getRange(i+1,4).setValue(conges);
        ws.getRange(i+1,5).setValue(prime);
        found = true;
        break;
      }
    }
    if (!found) {
      ws.appendRow([nom, debut, fin, conges, prime]);
    }
    var adminUrl = url + "?page=admin&pwd=" + e.parameter.pwd;
    return HtmlService.createHtmlOutput(
      '<html><head><meta http-equiv="refresh" content="0;url=' + adminUrl + '"></head>'
      + '<body><a href="' + adminUrl + '">OK - Retour admin</a></body></html>'
    ).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch(err) {
    return HtmlService.createHtmlOutput("<p>Erreur: " + err.message + "</p>").setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
}

function saveAjoutCoiff(e) {
  var url = ScriptApp.getService().getUrl();
  if (e.parameter.pwd !== CONFIG.MOT_DE_PASSE) return HtmlService.createHtmlOutput("<p>Erreur</p>").setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  var ws = getWSCoiff();
  ws.appendRow([e.parameter.nom, e.parameter.debut || "09:00", e.parameter.fin || "19:00", "", 0]);
  var adminUrl = url + "?page=admin&pwd=" + e.parameter.pwd;
  return HtmlService.createHtmlOutput(
    '<!DOCTYPE html><html><head><meta http-equiv="refresh" content="2;url=' + adminUrl + '"><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:sans-serif;background:#0A0A0F;color:#fff;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;text-align:center}</style></head><body>'
    + '<div style="font-size:64px;margin-bottom:16px">✅</div>'
    + '<div style="font-size:20px;font-weight:800;color:#10B981;margin-bottom:8px">' + e.parameter.nom + ' ajoute !</div>'
    + '<a href="' + adminUrl + '" style="padding:12px 24px;background:#6366F1;color:#fff;border-radius:10px;text-decoration:none;font-weight:700">Retour admin</a>'
    + '</body></html>'
  ).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function showFournisseurs(e) {
  var url = ScriptApp.getService().getUrl();
  if (e.parameter.pwd !== CONFIG.MOT_DE_PASSE) return HtmlService.createHtmlOutput("<p>Erreur</p>").setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  var ws = getWSFournisseurs();
  var fournisseurs = ws.getLastRow() > 1 ? ws.getRange(2,1,ws.getLastRow()-1,5).getValues() : [];

  var listHTML = fournisseurs.length === 0 ? '<div style="text-align:center;color:#555;padding:30px">Aucun fournisseur</div>' :
    fournisseurs.map(function(f) {
      return '<div style="background:#1a1a2e;border-radius:12px;padding:14px;margin-bottom:10px;border-left:4px solid #6366F1">'
        + '<div style="font-size:15px;font-weight:700;margin-bottom:6px">🏭 ' + f[0] + '</div>'
        + '<div style="font-size:13px;color:#aaa;margin-bottom:3px">📦 ' + (f[1]||"") + '</div>'
        + (f[2] ? '<div style="font-size:13px;margin-bottom:3px">📞 <a href="tel:' + f[2] + '" style="color:#6366F1;text-decoration:none">' + f[2] + '</a></div>' : '')
        + (f[3] ? '<div style="font-size:12px;color:#888">📧 ' + f[3] + '</div>' : '')
        + (f[4] ? '<div style="font-size:12px;color:#666;margin-top:4px">' + f[4] + '</div>' : '')
        + '</div>';
    }).join("");

  var html = '<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta charset="UTF-8">'
    + '<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:sans-serif;background:#0A0A0F;color:#fff}.hdr{background:linear-gradient(135deg,#6366F1,#4F46E5);padding:16px;display:flex;justify-content:space-between;align-items:center}.hdr h1{font-size:17px;font-weight:700}.hdr a{color:rgba(255,255,255,.85);font-size:12px;text-decoration:none;background:rgba(255,255,255,.2);padding:7px 14px;border-radius:20px}.ct{padding:14px}.btn{display:block;width:100%;padding:14px;background:#6366F1;color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:700;text-decoration:none;text-align:center;margin-bottom:14px;cursor:pointer;font-family:sans-serif}.safe{height:40px}label{display:block;font-size:11px;color:#888;text-transform:uppercase;margin-bottom:6px;margin-top:12px}input,textarea{width:100%;padding:13px;background:#1a1a2e;border:1.5px solid #21213A;border-radius:10px;color:#fff;font-size:15px;font-family:sans-serif}</style></head><body>'
    + '<div class="hdr"><h1>🏭 Fournisseurs</h1><a href="' + url + '?page=admin&pwd=' + e.parameter.pwd + '">Retour</a></div>'
    + '<div class="ct">'
    + '<a href="' + url + '?page=commandes&pwd=' + e.parameter.pwd + '" class="btn">📦 Voir les commandes</a>'
    + '<div style="font-size:11px;font-weight:700;color:#6366F1;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px">Mes fournisseurs</div>'
    + listHTML
    + '<div style="font-size:11px;font-weight:700;color:#6366F1;text-transform:uppercase;letter-spacing:1px;margin:16px 0 12px">Ajouter un fournisseur</div>'
    + '<form action="' + url + '" method="get">'
    + '<input type="hidden" name="page" value="savefournisseur">'
    + '<input type="hidden" name="pwd" value="' + e.parameter.pwd + '">'
    + '<label>Nom *</label><input type="text" name="nom" placeholder="Nom du fournisseur" required>'
    + '<label>Produits</label><input type="text" name="produits" placeholder="Shampoing, colorations...">'
    + '<label>Telephone</label><input type="tel" name="tel" placeholder="06 00 00 00 00">'
    + '<label>Email</label><input type="email" name="email" placeholder="contact@fournisseur.fr">'
    + '<label>Notes</label><input type="text" name="notes" placeholder="Livraison 48h...">'
    + '<button type="submit" style="width:100%;padding:14px;background:#6366F1;color:#fff;border:none;border-radius:10px;font-size:16px;font-weight:700;cursor:pointer;margin-top:16px">Ajouter</button>'
    + '</form>'
    + '<div class="safe"></div></div>'
    + '</body></html>';
  return HtmlService.createHtmlOutput(html).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function saveFournisseur(e) {
  var url = ScriptApp.getService().getUrl();
  if (e.parameter.pwd !== CONFIG.MOT_DE_PASSE) return HtmlService.createHtmlOutput("<p>Erreur</p>").setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  getWSFournisseurs().appendRow([e.parameter.nom, e.parameter.produits||"", e.parameter.tel||"", e.parameter.email||"", e.parameter.notes||""]);
  var retour = url + "?page=fournisseurs&pwd=" + e.parameter.pwd;
  return HtmlService.createHtmlOutput('<meta http-equiv="refresh" content="1;url=' + retour + '"><p>Fournisseur ajoute !</p>').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function showCommandes(e) {
  var url = ScriptApp.getService().getUrl();
  if (e.parameter.pwd !== CONFIG.MOT_DE_PASSE) return HtmlService.createHtmlOutput("<p>Erreur</p>").setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  var ws = getWSCommandes();
  var commandes = ws.getLastRow() > 1 ? ws.getRange(2,1,ws.getLastRow()-1,6).getValues() : [];
  commandes.reverse();

  var listHTML = commandes.length === 0 ? '<div style="text-align:center;color:#555;padding:30px">Aucune commande</div>' :
    commandes.map(function(c) {
      var statCol = c[5]==="Livree" ? "#10B981" : c[5]==="En cours" ? "#F59E0B" : "#6366F1";
      return '<div style="background:#1a1a2e;border-radius:12px;padding:14px;margin-bottom:10px;border-left:4px solid ' + statCol + '">'
        + '<div style="display:flex;justify-content:space-between;margin-bottom:6px">'
        + '<span style="font-size:14px;font-weight:700">' + c[2] + '</span>'
        + '<span style="font-size:11px;color:' + statCol + ';font-weight:700">' + c[5] + '</span>'
        + '</div>'
        + '<div style="font-size:12px;color:#aaa">🏭 ' + c[1] + ' · 📅 ' + c[0] + '</div>'
        + '<div style="font-size:12px;color:#888;margin-top:3px">Qte: ' + c[3] + ' · Prix: ' + c[4] + ' EU</div>'
        + '</div>';
    }).join("");

  // Récupérer fournisseurs pour le select
  var wsF = getWSFournisseurs();
  var fourns = wsF.getLastRow() > 1 ? wsF.getRange(2,1,wsF.getLastRow()-1,1).getValues().map(function(r){return r[0];}) : [];
  var fournOpts = fourns.length === 0 ? '<option>Aucun fournisseur</option>' : fourns.map(function(f){return '<option value="'+f+'">'+f+'</option>';}).join("");

  var html = '<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta charset="UTF-8">'
    + '<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:sans-serif;background:#0A0A0F;color:#fff}.hdr{background:linear-gradient(135deg,#6366F1,#4F46E5);padding:16px;display:flex;justify-content:space-between;align-items:center}.hdr h1{font-size:17px;font-weight:700}.hdr a{color:rgba(255,255,255,.85);font-size:12px;text-decoration:none;background:rgba(255,255,255,.2);padding:7px 14px;border-radius:20px}.ct{padding:14px}label{display:block;font-size:11px;color:#888;text-transform:uppercase;margin-bottom:6px;margin-top:12px}input,select{width:100%;padding:13px;background:#1a1a2e;border:1.5px solid #21213A;border-radius:10px;color:#fff;font-size:15px;font-family:sans-serif}.stitle{font-size:11px;font-weight:700;color:#6366F1;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px}.safe{height:40px}</style></head><body>'
    + '<div class="hdr"><h1>📦 Commandes</h1><a href="' + url + '?page=fournisseurs&pwd=' + e.parameter.pwd + '">Retour</a></div>'
    + '<div class="ct">'
    + '<div class="stitle">Passer une commande</div>'
    + '<form action="' + url + '" method="get">'
    + '<input type="hidden" name="page" value="savecommande">'
    + '<input type="hidden" name="pwd" value="' + e.parameter.pwd + '">'
    + '<label>Fournisseur</label><select name="fournisseur">' + fournOpts + '</select>'
    + '<label>Produit *</label><input type="text" name="produit" placeholder="Shampoing..." required>'
    + '<label>Quantite</label><input type="number" name="quantite" placeholder="1">'
    + '<label>Prix EU</label><input type="number" name="prix" placeholder="0">'
    + '<label>Statut</label><select name="statut"><option value="En attente">En attente</option><option value="En cours">En cours</option><option value="Livree">Livree</option></select>'
    + '<button type="submit" style="width:100%;padding:14px;background:#6366F1;color:#fff;border:none;border-radius:10px;font-size:16px;font-weight:700;cursor:pointer;margin-top:16px">Commander</button>'
    + '</form>'
    + '<div class="stitle" style="margin-top:20px">Historique des commandes</div>'
    + listHTML
    + '<div class="safe"></div></div>'
    + '</body></html>';
  return HtmlService.createHtmlOutput(html).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function saveCommande(e) {
  var url = ScriptApp.getService().getUrl();
  if (e.parameter.pwd !== CONFIG.MOT_DE_PASSE) return HtmlService.createHtmlOutput("<p>Erreur</p>").setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  var today = Utilities.formatDate(new Date(), "Europe/Paris", "yyyy-MM-dd");
  getWSCommandes().appendRow([today, e.parameter.fournisseur||"", e.parameter.produit||"", e.parameter.quantite||1, parseFloat(e.parameter.prix)||0, e.parameter.statut||"En attente"]);
  var retour = url + "?page=commandes&pwd=" + e.parameter.pwd;
  return HtmlService.createHtmlOutput('<meta http-equiv="refresh" content="1;url=' + retour + '"><p>Commande enregistree !</p>').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getConfirmPage(d, id) {
  var url = ScriptApp.getService().getUrl();
  return '<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta charset="UTF-8"><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:sans-serif;background:#0F0F1A;color:#fff;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;text-align:center}.icon{font-size:72px;margin-bottom:16px}.t{font-size:22px;font-weight:800;color:#10B981;margin-bottom:6px}.s{font-size:13px;color:#666;margin-bottom:20px}.card{background:#161622;border:1.5px solid rgba(99,102,241,.3);border-radius:14px;padding:16px;width:100%;max-width:340px;text-align:left;margin-bottom:16px}.row{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #21213A;font-size:14px}.row:last-child{border-bottom:none;font-weight:700;color:#6366F1;font-size:16px}.lbl{color:#666}.ref{color:#333;font-size:11px;margin-bottom:16px}.btn{display:block;width:100%;max-width:340px;padding:14px;border:none;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;text-decoration:none;text-align:center;margin-bottom:8px}.bp{background:#6366F1;color:#fff}.bs{background:#161622;color:#666;border:1.5px solid #21213A}</style></head><body>'
    + '<div class="icon">✅</div>'
    + '<div class="t">RDV Confirme !</div>'
    + '<div class="s">Votre reservation est enregistree</div>'
    + '<div class="card">'
    + '<div class="row"><span class="lbl">Service</span><span>' + d.service + '</span></div>'
    + '<div class="row"><span class="lbl">Date</span><span>' + d.date + '</span></div>'
    + '<div class="row"><span class="lbl">Heure</span><span>' + d.heure + '</span></div>'
    + '<div class="row"><span class="lbl">Coiffeuse</span><span>' + (d.coiffeuse || "Pas de preference") + '</span></div>'
    + '<div class="row"><span class="lbl">Client</span><span>' + d.nom + '</span></div>'
    + '<div class="row"><span class="lbl">Prix</span><span>' + d.prix + ' EU</span></div>'
    + '</div>'
    + '<div class="ref">Ref : ' + id + '</div>'
    + '<a href="' + url + '" class="btn bp">Nouveau RDV</a>'
    + '<a href="tel:' + CONFIG.TEL + '" class="btn bs">Appeler</a>'
    + '</body></html>';
}

// ════════════════════════════
// ESPACE PRO
// ════════════════════════════
function showAdmin(e) {
  var url = ScriptApp.getService().getUrl();
  var pwd = e.parameter.pwd || "";
  if (pwd !== CONFIG.MOT_DE_PASSE) {
    return HtmlService.createHtmlOutput(getLoginPage(url))
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  // Initialiser les sheets si necessaire
  getWSCoiff();
  getWSFournisseurs();
  getWSCommandes();
  var rdvs = getRDVs();
  var coiffData = getCoiffData();

  // Stats globales
  var ca = 0, confirmes = 0, annules = 0;
  rdvs.forEach(function(r) {
    if (r[9] === "Confirme") { confirmes++; ca += parseFloat(r[7]) || 0; }
    if (r[9] === "Annule") annules++;
  });

  // RDV confirmés triés par date
  var aVenir = rdvs.filter(function(r) { return r[9] === "Confirme"; });
  aVenir.sort(function(a, b) { return a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : a[2] < b[2] ? -1 : 1; });

  // Grouper par date
  var byDate = {};
  var dates = [];
  aVenir.forEach(function(r) {
    var d = String(r[1]);
    if (!byDate[d]) { byDate[d] = []; dates.push(d); }
    byDate[d].push(r);
  });

  // HTML RDV groupés par date
  var rdvHTML = "";
  if (dates.length === 0) {
    rdvHTML = '<div style="text-align:center;color:#555;padding:40px">Aucun RDV confirme</div>';
  } else {
    dates.forEach(function(d) {
      rdvHTML += '<div style="background:#6366F1;padding:10px 14px;font-size:13px;font-weight:700;color:#fff;display:flex;justify-content:space-between;margin-top:8px">'
        + '<span>📅 ' + d + '</span>'
        + '<span style="background:rgba(255,255,255,.2);padding:2px 10px;border-radius:20px">' + byDate[d].length + ' RDV</span>'
        + '</div>';
      byDate[d].forEach(function(r) {
        var col = getSvcColor(r[6]);
        rdvHTML += '<div style="background:#1a1a2e;padding:12px 14px;border-left:4px solid ' + col + ';margin-bottom:2px">'
          + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">'
          + '<span style="font-size:14px;font-weight:700">⏰ ' + r[2] + ' &nbsp; ' + r[3] + '</span>'
          + '<a href="' + url + '?page=annuler&id=' + r[0] + '&pwd=' + pwd + '" style="font-size:11px;color:#EF4444;text-decoration:none;padding:3px 10px;background:#1a0505;border-radius:6px">Annuler</a>'
          + '</div>'
          + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px">'
          + '<span style="font-size:12px;padding:3px 10px;background:' + col + '22;color:' + col + ';border-radius:20px;font-weight:600">✂️ ' + r[6] + ' · 💰 ' + r[7] + ' EU</span>'
          + '<a href="tel:' + r[4] + '" style="color:#6366F1;font-size:13px;text-decoration:none;font-weight:600">📞 ' + r[4] + '</a>'
          + '</div>'
          + '<div style="font-size:12px;color:#888">💇 ' + (r[10] || "Pas de preference") + '</div>'
          + '</div>';
      });
    });
  }

  // Stats par service
  var svcMap = {};
  rdvs.forEach(function(r) {
    if (r[9] === "Confirme") {
      var k = r[6] || "Autre";
      if (!svcMap[k]) svcMap[k] = { nb: 0, ca: 0 };
      svcMap[k].nb++;
      svcMap[k].ca += parseFloat(r[7]) || 0;
    }
  });
  var statsHTML = "";
  Object.keys(svcMap).sort(function(a, b) { return svcMap[b].ca - svcMap[a].ca; }).forEach(function(k) {
    var s = svcMap[k], pct = ca > 0 ? Math.round(s.ca / ca * 100) : 0, col = getSvcColor(k);
    statsHTML += '<div style="background:#1a1a2e;border-radius:12px;padding:14px;margin-bottom:10px">'
      + '<div style="display:flex;justify-content:space-between;margin-bottom:8px">'
      + '<div><div style="font-size:14px;font-weight:700;color:' + col + '">' + k + '</div>'
      + '<div style="font-size:11px;color:#888;margin-top:2px">' + s.nb + ' RDV · ' + pct + '% du CA</div></div>'
      + '<div style="font-size:18px;font-weight:800;color:' + col + '">' + s.ca.toFixed(0) + ' EU</div>'
      + '</div>'
      + '<div style="height:6px;background:#21213A;border-radius:3px"><div style="height:6px;background:' + col + ';border-radius:3px;width:' + pct + '%"></div></div></div>';
  });
  if (!statsHTML) statsHTML = '<div style="text-align:center;color:#555;padding:30px">Aucune donnee</div>';

  // Stats par coiffeuse
  var coiffStats = {};
  rdvs.forEach(function(r) {
    if (r[9] === "Confirme") {
      var k = r[10] || "Pas de preference";
      if (!coiffStats[k]) coiffStats[k] = { nb: 0, ca: 0 };
      coiffStats[k].nb++;
      coiffStats[k].ca += parseFloat(r[7]) || 0;
    }
  });

  // HTML coiffeuses
  var coiffHTML = "";
  var coiffEmojis = { "Biniouf": "💇", "Remilienne": "💅" };
  CONFIG.COIFFEUSES.forEach(function(nom) {
    var stats = coiffStats[nom] || { nb: 0, ca: 0 };
    var d = coiffData[nom] || { debut: "09:00", fin: "19:00", conges: "", prime: 0 };
    var emoji = coiffEmojis[nom] || "💇";
    coiffHTML += '<div style="background:#1a1a2e;border-radius:14px;padding:16px;margin-bottom:14px;border:1.5px solid #21213A">'
      + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">'
      + '<div style="display:flex;align-items:center;gap:10px">'
      + '<div style="width:48px;height:48px;background:#6366F122;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:24px">' + emoji + '</div>'
      + '<div><div style="font-size:16px;font-weight:800">' + nom + '</div><div style="font-size:11px;color:#10B981">Active</div></div>'
      + '</div>'
      + '<div style="text-align:right"><div style="font-size:18px;font-weight:800;color:#F59E0B">' + stats.ca.toFixed(0) + ' EU</div>'
      + '<div style="font-size:11px;color:#888">' + stats.nb + ' RDV</div></div>'
      + '</div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">'
      + '<div style="background:#111;border-radius:8px;padding:10px;text-align:center">'
      + '<div style="font-size:10px;color:#888;margin-bottom:3px">HORAIRES</div>'
      + '<div style="font-size:13px;font-weight:700">' + d.debut + ' - ' + d.fin + '</div>'
      + '</div>'
      + '<div style="background:#111;border-radius:8px;padding:10px;text-align:center">'
      + '<div style="font-size:10px;color:#888;margin-bottom:3px">PRIME</div>'
      + '<div style="font-size:13px;font-weight:700;color:#F59E0B">' + d.prime + ' EU</div>'
      + '</div>'
      + '</div>'
      + '<div style="background:#111;border-radius:8px;padding:10px;margin-bottom:12px">'
      + '<div style="font-size:10px;color:#888;margin-bottom:3px">CONGES</div>'
      + '<div style="font-size:13px">' + (d.conges || "Aucun conge") + '</div>'
      + '</div>'
      + '<a href="' + url + '?page=editcoiff&nom=' + nom + '&pwd=' + pwd + '" style="display:block;text-align:center;padding:10px;background:#6366F1;color:#fff;border-radius:10px;text-decoration:none;font-weight:700">Modifier</a>'
      + '</div>';
  });

  // Formulaire ajout
  var servOpts = CONFIG.SERVICES.map(function(s) { return '<option value="' + s.nom + '">' + s.nom + ' (' + s.prix + ' EU)</option>'; }).join("");
  var coiffOpts = '<option value="Pas de preference">Pas de preference</option>'
    + CONFIG.COIFFEUSES.map(function(n) { return '<option value="' + n + '">' + n + '</option>'; }).join("");

  var ajoutHTML = '<form action="' + url + '" method="get" style="display:flex;flex-direction:column;gap:10px">'
    + '<input type="hidden" name="page" value="saveajout">'
    + '<input type="hidden" name="pwd" value="' + pwd + '">'
    + '<input type="text" name="nom" placeholder="Nom du client" required style="padding:13px;background:#1a1a2e;border:1.5px solid #21213A;border-radius:10px;color:#fff;font-size:15px;font-family:sans-serif">'
    + '<input type="tel" name="tel" placeholder="Telephone" required style="padding:13px;background:#1a1a2e;border:1.5px solid #21213A;border-radius:10px;color:#fff;font-size:15px;font-family:sans-serif">'
    + '<input type="date" name="date" required style="padding:13px;background:#1a1a2e;border:1.5px solid #21213A;border-radius:10px;color:#fff;font-size:15px;font-family:sans-serif">'
    + '<input type="time" name="heure" required style="padding:13px;background:#1a1a2e;border:1.5px solid #21213A;border-radius:10px;color:#fff;font-size:15px;font-family:sans-serif">'
    + '<select name="service" style="padding:13px;background:#1a1a2e;border:1.5px solid #21213A;border-radius:10px;color:#fff;font-size:15px;font-family:sans-serif">' + servOpts + '</select>'
    + '<select name="coiffeuse" style="padding:13px;background:#1a1a2e;border:1.5px solid #21213A;border-radius:10px;color:#fff;font-size:15px;font-family:sans-serif">' + coiffOpts + '</select>'
    + '<input type="number" name="prix" placeholder="Prix EU" style="padding:13px;background:#1a1a2e;border:1.5px solid #21213A;border-radius:10px;color:#fff;font-size:15px;font-family:sans-serif">'
    + '<button type="submit" style="padding:15px;background:#6366F1;color:#fff;border:none;border-radius:10px;font-size:16px;font-weight:700;cursor:pointer">Ajouter le RDV</button>'
    + '</form>';

  var html = '<!DOCTYPE html><html><head>'
    + '<meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<meta charset="UTF-8"><title>Admin - ' + CONFIG.NOM + '</title>'
    + '<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:sans-serif;background:#0A0A0F;color:#fff}'
    + '.hdr{background:linear-gradient(135deg,#6366F1,#4F46E5);padding:16px;display:flex;justify-content:space-between;align-items:center}'
    + '.hdr h1{font-size:17px;font-weight:700}.hdr a{color:rgba(255,255,255,.85);font-size:12px;text-decoration:none;background:rgba(255,255,255,.2);padding:7px 14px;border-radius:20px}'
    + '.kpis{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:14px}'
    + '.kpi{background:#1a1a2e;border-radius:14px;padding:16px;text-align:center}'
    + '.kv{font-size:22px;font-weight:800;margin-bottom:3px}.kl{font-size:11px;color:#888}'
    + '.tabs{display:flex;overflow-x:auto;gap:8px;padding:0 14px 14px;scrollbar-width:none}'
    + '.tab{flex-shrink:0;padding:9px 16px;border-radius:20px;font-size:12px;font-weight:700;cursor:pointer;border:none;font-family:sans-serif}'
    + '.tab.on{background:#6366F1;color:#fff}.tab.off{background:#1a1a2e;color:#888;border:1px solid #21213A}'
    + '.pane{display:none}.pane.show{display:block}'
    + '.ptitle{font-size:11px;font-weight:700;color:#6366F1;text-transform:uppercase;letter-spacing:1px;margin:14px 14px 10px}'
    + '.safe{height:40px}'
    + '</style></head><body>'
    + '<div class="hdr"><h1>' + CONFIG.EMOJI + ' ' + CONFIG.NOM + '</h1><a href="' + url + '">Site client</a></div>'
    + '<div class="kpis">'
    + '<div class="kpi"><div class="kv" style="color:#F59E0B">' + ca.toFixed(0) + ' EU</div><div class="kl">CA Total</div></div>'
    + '<div class="kpi"><div class="kv" style="color:#10B981">' + confirmes + '</div><div class="kl">Confirmes</div></div>'
    + '<div class="kpi"><div class="kv" style="color:#6366F1">' + aVenir.length + '</div><div class="kl">RDV actifs</div></div>'
    + '<div class="kpi"><div class="kv" style="color:#EF4444">' + annules + '</div><div class="kl">Annules</div></div>'
    + '</div>'
    + '<div class="tabs">'
    + '<button class="tab on" onclick="sw(0,this)">📅 RDV (' + aVenir.length + ')</button>'
    + '<button class="tab off" onclick="sw(1,this)">💇 Equipe</button>'
    + '<button class="tab off" onclick="sw(2,this)">📊 Stats</button>'
    + '<button class="tab off" onclick="sw(3,this)">➕ Ajouter</button>'
    + '<button class="tab off" onclick="sw(4,this)">🏭 Pro</button>'
    + '</div>'
    + '<div class="pane show" id="p0">' + rdvHTML + '</div>'
    + '<div class="pane" id="p1"><div class="ptitle">Equipe</div><div style="padding:0 14px">' + coiffHTML + '<a href="' + url + '?page=ajoutcoiff&pwd=' + pwd + '" style="display:block;text-align:center;padding:12px;background:#1a1a2e;color:#6366F1;border-radius:10px;font-size:14px;text-decoration:none;font-weight:700;border:1.5px solid #6366F1">➕ Ajouter un coiffeur</a></div></div>'
    + '<div class="pane" id="p2"><div class="ptitle">Stats par service</div><div style="padding:0 14px">' + statsHTML + '</div></div>'
    + '<div class="pane" id="p3"><div class="ptitle">Ajouter un RDV</div><div style="padding:0 14px">' + ajoutHTML + '</div></div>'
    + '<div class="pane" id="p4"><div class="ptitle">Espace Pro</div><div style="padding:0 14px"><a href="' + url + '?page=fournisseurs&pwd=' + pwd + '" style="display:block;padding:16px;background:#1a1a2e;border-radius:12px;margin-bottom:10px;text-decoration:none;color:#fff;border:1.5px solid #21213A;font-size:15px;font-weight:600">🏭 Fournisseurs</a><a href="' + url + '?page=commandes&pwd=' + pwd + '" style="display:block;padding:16px;background:#1a1a2e;border-radius:12px;margin-bottom:10px;text-decoration:none;color:#fff;border:1.5px solid #21213A;font-size:15px;font-weight:600">📦 Commander des produits</a></div></div>'
    + '<div class="safe"></div>'
    + '<script>function sw(n,el){for(var i=0;i<5;i++){var p=document.getElementById("p"+i);if(p)p.className="pane"+(i===n?" show":"");}document.querySelectorAll(".tab").forEach(function(t,i){t.className="tab "+(i===n?"on":"off");});}</script>'
    + '</body></html>';

  return HtmlService.createHtmlOutput(html).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getLoginPage(url) {
  return '<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta charset="UTF-8"><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:sans-serif;background:#0F0F1A;color:#fff;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}.card{background:#161622;border:1.5px solid #21213A;border-radius:16px;padding:28px;width:100%;max-width:340px;text-align:center}.logo{font-size:48px;margin-bottom:12px}.t{font-size:20px;font-weight:800;margin-bottom:4px}.s{font-size:13px;color:#666;margin-bottom:24px}input{width:100%;padding:14px;background:#0F0F1A;border:1.5px solid #21213A;border-radius:10px;color:#fff;font-size:16px;font-family:sans-serif;text-align:center;letter-spacing:4px;margin-bottom:14px}.btn{width:100%;padding:14px;background:#6366F1;color:#fff;border:none;border-radius:10px;font-size:16px;font-weight:700;cursor:pointer;font-family:sans-serif}</style></head><body><div class="card"><div class="logo">🔒</div><div class="t">Acces Pro</div><div class="s">Mot de passe</div><form action="' + url + '" method="get"><input type="hidden" name="page" value="admin"><input type="password" name="pwd" placeholder="••••••••" autofocus><button type="submit" class="btn">Connexion</button></form></div></body></html>';
}

// ════════════════════════════
// PAGE CLIENT
// ════════════════════════════
function showHome() {
  var url = ScriptApp.getService().getUrl();
  var servicesJSON = JSON.stringify(CONFIG.SERVICES);
  var coiffJSON = JSON.stringify(CONFIG.COIFFEUSES);

  var html = '<!DOCTYPE html><html><head>'
    + '<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">'
    + '<meta charset="UTF-8"><title>' + CONFIG.NOM + '</title>'
    + '<style>'
    + '*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}'
    + 'body{font-family:sans-serif;background:#0F0F1A;color:#fff;min-height:100vh}'
    + '.hdr{background:linear-gradient(135deg,#6366F1,#4F46E5);padding:28px 20px 20px;text-align:center}'
    + '.logo{font-size:48px;margin-bottom:8px}.htitle{font-size:22px;font-weight:800}'
    + '.hsous{font-size:13px;color:rgba(255,255,255,.6);margin-top:4px}'
    + '.hadr{font-size:11px;color:rgba(255,255,255,.4);margin-top:8px}'
    + '.steps{display:flex;justify-content:center;align-items:center;gap:4px;padding:12px 16px;background:#161622}'
    + '.step{font-size:11px;font-weight:600;color:#555;display:flex;align-items:center;gap:4px}'
    + '.step.on{color:#6366F1}.step.ok{color:#10B981}'
    + '.sn{width:20px;height:20px;border-radius:50%;background:#21213A;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700}'
    + '.step.on .sn{background:#6366F1;color:#fff}.step.ok .sn{background:#10B981;color:#fff}'
    + '.sep{flex:1;height:1px;background:#21213A;max-width:14px}'
    + '.ct{padding:18px}'
    + '.stl{font-size:10px;font-weight:700;color:#6366F1;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:12px}'
    + '.sgrid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px}'
    + '.cgrid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:20px}'
    + '.scard{background:#161622;border:2px solid #21213A;border-radius:14px;padding:16px 12px;cursor:pointer;display:block;width:100%;text-align:left;color:#fff;font-family:sans-serif}'
    + '.scard.sel{border-color:#6366F1;background:rgba(99,102,241,.15)}'
    + '.sname{font-size:13px;font-weight:600;margin-bottom:10px}'
    + '.sinfo{display:flex;justify-content:space-between;align-items:center}'
    + '.sprix{font-size:16px;font-weight:800;color:#6366F1}'
    + '.sdur{font-size:10px;color:#555;background:#21213A;padding:2px 7px;border-radius:6px}'
    + '.field{margin-bottom:14px}'
    + '.field label{display:block;font-size:10px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.5px;margin-bottom:7px}'
    + '.field input{width:100%;padding:14px;background:#161622;border:2px solid #21213A;border-radius:12px;color:#fff;font-size:15px;font-family:sans-serif}'
    + '.field input:focus{outline:none;border-color:#6366F1}'
    + '.iw{position:relative;margin-bottom:14px}'
    + '.iw label{display:block;font-size:10px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.5px;margin-bottom:7px}'
    + '.iw input{width:100%;padding:14px 14px 14px 42px;background:#161622;border:2px solid #21213A;border-radius:12px;color:#fff;font-size:15px;font-family:sans-serif}'
    + '.iw input:focus{outline:none;border-color:#6366F1}'
    + '.ii{position:absolute;left:13px;bottom:14px;font-size:16px}'
    + '.clist{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:16px}'
    + '.ci{background:#161622;border:2px solid #21213A;border-radius:10px;padding:10px 4px;text-align:center;font-size:13px;font-weight:600;cursor:pointer;display:block;width:100%;color:#fff;font-family:sans-serif}'
    + '.ci.sel{background:#6366F1;border-color:#6366F1;color:#fff}'
    + '.recap{background:#161622;border:2px solid rgba(99,102,241,.3);border-radius:14px;padding:16px;margin-bottom:16px}'
    + '.rr{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #21213A;font-size:14px}'
    + '.rr:last-child{border-bottom:none;font-weight:700;color:#6366F1;font-size:16px}'
    + '.rl{color:#666}'
    + '.btn{display:block;width:100%;padding:16px;border:none;border-radius:12px;font-size:16px;font-weight:700;cursor:pointer;font-family:sans-serif;margin-bottom:10px}'
    + '.bp{background:#6366F1;color:#fff}.bs{background:#21213A;color:#666}'
    + '.ninfo{background:#161622;border:1px solid #21213A;border-radius:12px;padding:14px;font-size:12px;color:#666;margin-bottom:16px;line-height:1.9}'
    + '.safe{height:50px}.adm{text-align:center;padding:12px;color:#333;font-size:11px}.adm a{color:#333;text-decoration:none}'
    + '.et{display:none}.et.show{display:block}'
    + '.nc{text-align:center;color:#555;font-size:13px;padding:20px;background:#161622;border-radius:12px}'
    + '.ld{text-align:center;padding:20px;color:#6366F1;font-size:13px}'
    + '.cf-emoji{font-size:28px;margin-bottom:6px}'
    + '.cf-nom{font-size:14px;font-weight:700;text-align:center}'
    + '</style></head><body>'
    + '<div class="hdr">'
    + '<div class="logo">' + CONFIG.EMOJI + '</div>'
    + '<div class="htitle">' + CONFIG.NOM + '</div>'
    + '<div class="hsous">Reservez en ligne</div>'
    + '<div class="hadr">📍 ' + CONFIG.ADRESSE + ' · 📞 ' + CONFIG.TEL + '</div>'
    + '</div>'
    + '<div class="steps" id="steps">'
    + '<div class="step on" id="st1"><div class="sn">1</div><span>Service</span></div>'
    + '<div class="sep"></div>'
    + '<div class="step" id="st2"><div class="sn">2</div><span>Coiffeuse</span></div>'
    + '<div class="sep"></div>'
    + '<div class="step" id="st3"><div class="sn">3</div><span>Creneau</span></div>'
    + '<div class="sep"></div>'
    + '<div class="step" id="st4"><div class="sn">4</div><span>Infos</span></div>'
    + '<div class="sep"></div>'
    + '<div class="step" id="st5"><div class="sn">5</div><span>OK</span></div>'
    + '</div>'
    + '<div class="ct">'

    // ÉTAPE 1 : SERVICE
    + '<div class="et show" id="e1">'
    + '<div class="stl">Choisissez votre service</div>'
    + '<div class="sgrid" id="sgrid"></div>'
    + '<div class="ninfo">⏰ ' + CONFIG.HEURE_DEBUT + ' - ' + CONFIG.HEURE_FIN + '<br>📍 ' + CONFIG.ADRESSE + '<br>📞 ' + CONFIG.TEL + '</div>'
    + '<button class="btn bp" onclick="go(2)">Continuer</button>'
    + '</div>'

    // ÉTAPE 2 : COIFFEUSE
    + '<div class="et" id="e2">'
    + '<div class="stl">Choisissez votre coiffeuse</div>'
    + '<div class="cgrid" id="cgrid"></div>'
    + '<button class="btn bs" onclick="go(1)">Retour</button>'
    + '</div>'

    // ÉTAPE 3 : DATE + CRÉNEAUX
    + '<div class="et" id="e3">'
    + '<div class="stl">Choisissez une date</div>'
    + '<div class="field"><label>Date</label><input type="date" id="dateIn" min="' + getTomorrow() + '" max="' + getMaxDate() + '" onchange="loadC()"></div>'
    + '<div class="stl" style="margin-top:14px">Creneaux disponibles</div>'
    + '<div id="czone"><div class="nc">Selectionnez une date</div></div>'
    + '<button class="btn bs" onclick="go(2)" style="margin-top:12px">Retour</button>'
    + '</div>'

    // ÉTAPE 4 : INFOS
    + '<div class="et" id="e4">'
    + '<div class="stl">Vos coordonnees</div>'
    + '<div class="iw"><label>Nom</label><span class="ii">👤</span><input type="text" id="nom" placeholder="Jean Martin"></div>'
    + '<div class="iw"><label>Telephone</label><span class="ii">📞</span><input type="tel" id="tel" placeholder="06 00 00 00 00"></div>'
    + '<div class="iw"><label>Email</label><span class="ii">📧</span><input type="email" id="email" placeholder="jean@email.fr"></div>'
    + '<button class="btn bp" onclick="go(5)">Continuer</button>'
    + '<button class="btn bs" onclick="go(3)">Retour</button>'
    + '</div>'

    // ÉTAPE 5 : RÉCAP
    + '<div class="et" id="e5">'
    + '<div class="stl">Recapitulatif</div>'
    + '<div class="recap" id="recap"></div>'
    + '<button class="btn bp" id="btnC" onclick="conf()">Confirmer mon RDV</button>'
    + '<button class="btn bs" onclick="go(4)">Modifier</button>'
    + '</div>'

    + '<div class="safe"></div></div>'
    + '<div class="adm"><a href="' + url + '?page=admin">Acces pro</a></div>'

    + '<script>'
    + 'var SVCS=' + servicesJSON + ';'
    + 'var COIFFS=' + coiffJSON + ';'
    + 'var URL="' + url + '";'
    + 'var sel=null,coiffeuse=null,date=null,heure=null;'

    // Générer services
    + 'var sg=document.getElementById("sgrid");'
    + 'for(var i=0;i<SVCS.length;i++){'
    + '  var b=document.createElement("button");b.type="button";b.className="scard";'
    + '  b.innerHTML="<div class=\'sname\'>"+SVCS[i].nom+"</div><div class=\'sinfo\'><span class=\'sprix\'>"+SVCS[i].prix+" EU</span><span class=\'sdur\'>"+SVCS[i].duree+" min</span></div>";'
    + '  (function(s,el){el.addEventListener("click",function(){sel=s;document.querySelectorAll(".scard").forEach(function(c){c.classList.remove("sel");});el.classList.add("sel");});})(SVCS[i],b);'
    + '  sg.appendChild(b);'
    + '}'

    // Générer coiffeuses
    + 'var cg=document.getElementById("cgrid");'
    + 'var cfEmojis=["💇","💅","🎲"];'
    + 'var cfNames=COIFFS.concat(["Au hasard"]);'
    + 'var cfVals=COIFFS.concat(["Pas de preference"]);'
    + 'for(var i=0;i<cfNames.length;i++){'
    + '  var b=document.createElement("button");b.type="button";b.className="scard";'
    + '  b.innerHTML="<div class=\'cf-emoji\'>"+(cfEmojis[i]||"💇")+"</div><div class=\'cf-nom\'>"+cfNames[i]+"</div>";'
    + '  (function(v,el){el.addEventListener("click",function(){coiffeuse=v;document.querySelectorAll(".scard").forEach(function(c){c.classList.remove("sel");});el.classList.add("sel");go(3);});})(cfVals[i],b);'
    + '  cg.appendChild(b);'
    + '}'

    + 'function go(n){'
    + '  if(n===2&&!sel){alert("Choisissez un service");return;}'
    + '  if(n===5){'
    + '    var nm=document.getElementById("nom").value.trim();'
    + '    var tl=document.getElementById("tel").value.trim();'
    + '    if(!nm||!tl){alert("Nom et telephone obligatoires");return;}'
    + '    if(!heure){alert("Choisissez un creneau");go(3);return;}'
    + '    showRecap();'
    + '  }'
    + '  for(var i=1;i<=5;i++){'
    + '    document.getElementById("e"+i).className="et"+(i===n?" show":"");'
    + '    document.getElementById("st"+i).className="step"+(i===n?" on":i<n?" ok":"");'
    + '  }'
    + '  window.scrollTo(0,0);'
    + '}'

    + 'function loadC(){'
    + '  date=document.getElementById("dateIn").value;'
    + '  if(!date)return;heure=null;'
    + '  var z=document.getElementById("czone");'
    + '  z.innerHTML="<div class=\'ld\'>Chargement...</div>";'
    + '  fetch(URL+"?page=creneaux&date="+date+"&duree="+(sel?sel.duree:30))'
    + '  .then(function(r){return r.json();})'
    + '  .then(function(d){'
    + '    if(!d.creneaux||!d.creneaux.length){z.innerHTML="<div class=\'nc\'>Aucun creneau disponible</div>";return;}'
    + '    var div=document.createElement("div");div.className="clist";'
    + '    for(var i=0;i<d.creneaux.length;i++){'
    + '      var btn=document.createElement("button");btn.type="button";btn.className="ci";btn.textContent=d.creneaux[i];'
    + '      (function(hh,el){el.addEventListener("click",function(){heure=hh;document.querySelectorAll(".ci").forEach(function(c){c.classList.remove("sel");});el.classList.add("sel");});})(d.creneaux[i],btn);'
    + '      div.appendChild(btn);'
    + '    }'
    + '    z.innerHTML="";z.appendChild(div);'
    + '    var nb=document.createElement("button");nb.type="button";nb.className="btn bp";nb.style.marginTop="12px";nb.textContent="Continuer";'
    + '    nb.addEventListener("click",function(){go(4);});z.appendChild(nb);'
    + '  })'
    + '  .catch(function(){z.innerHTML="<div class=\'nc\'>Erreur</div>";});'
    + '}'

    + 'function showRecap(){'
    + '  var nm=document.getElementById("nom").value.trim();'
    + '  document.getElementById("recap").innerHTML='
    + '    "<div class=\'rr\'><span class=\'rl\'>Service</span><span>"+sel.nom+"</span></div>"'
    + '    +"<div class=\'rr\'><span class=\'rl\'>Coiffeuse</span><span>"+(coiffeuse||"Pas de preference")+"</span></div>"'
    + '    +"<div class=\'rr\'><span class=\'rl\'>Date</span><span>"+date+"</span></div>"'
    + '    +"<div class=\'rr\'><span class=\'rl\'>Heure</span><span>"+heure+"</span></div>"'
    + '    +"<div class=\'rr\'><span class=\'rl\'>Client</span><span>"+nm+"</span></div>"'
    + '    +"<div class=\'rr\'><span class=\'rl\'>Prix</span><span>"+sel.prix+" EU</span></div>";'
    + '}'

    + 'function conf(){'
    + '  var btn=document.getElementById("btnC");btn.disabled=true;btn.textContent="En cours...";'
    + '  var nm=document.getElementById("nom").value.trim();'
    + '  var tl=document.getElementById("tel").value.trim();'
    + '  var em=document.getElementById("email").value.trim();'
    + '  var cf=coiffeuse||"Pas de preference";'
    + '  window.location.href=URL+"?page=confirmer&nom="+encodeURIComponent(nm)+"&tel="+encodeURIComponent(tl)+"&email="+encodeURIComponent(em)+"&date="+date+"&heure="+heure+"&service="+encodeURIComponent(sel.nom)+"&prix="+sel.prix+"&duree="+sel.duree+"&coiffeuse="+encodeURIComponent(cf);'
    + '}'
    + '</script></body></html>';

  return HtmlService.createHtmlOutput(html)
    .setTitle(CONFIG.NOM)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
