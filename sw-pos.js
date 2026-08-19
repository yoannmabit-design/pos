/* Service worker de la caisse.
   Chemins relatifs : fonctionne à la racine d'un site comme dans un
   sous-dossier (GitHub Pages). La portée est celle du dossier qui
   contient ce fichier, donc pas de conflit avec sw.js ni sw-admin.js
   tant que la caisse vit dans son propre dossier ou son propre dépôt.

   IMPORTANT : bump CACHE à chaque modification de pos.html,
   sinon l'appareil garde l'ancienne caisse en cache.
*/

var CACHE = "yfb-pos-v2";

var RESSOURCES = [
  "pos.html",
  "manifest-pos.json",
  "pos-192.png",
  "pos-512.png",
  "pos-maskable-192.png",
  "pos-maskable-512.png",
  "pos-apple-180.png"
];

// Racine de la portée du worker : "/" à la racine du site,
// "/nom-du-depot/" sur GitHub Pages. Calculée, jamais écrite en dur.
var BASE = self.location.pathname.replace(/sw-pos\.js$/, "");

self.addEventListener("install", function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(cache){
      // addAll échoue en bloc si une seule ressource manque : on tolère les absences
      return Promise.all(RESSOURCES.map(function(url){
        return cache.add(url).catch(function(){ return null; });
      }));
    }).then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function(e){
  e.waitUntil(
    caches.keys().then(function(cles){
      return Promise.all(cles.map(function(c){
        if(c !== CACHE) return caches.delete(c);
        return null;
      }));
    }).then(function(){ return self.clients.claim(); })
  );
});

/* Cache d'abord : la caisse doit démarrer instantanément et fonctionner
   sans réseau. La ressource est rafraîchie en arrière-plan pour la fois
   suivante (stale-while-revalidate). */
self.addEventListener("fetch", function(e){
  var req = e.request;
  if(req.method !== "GET") return;

  var url;
  try { url = new URL(req.url); }
  catch(err){ return; }
  if(url.origin !== self.location.origin) return;

  e.respondWith(
    caches.match(req).then(function(cache){
      var reseau = fetch(req).then(function(rep){
        if(rep && rep.ok){
          var copie = rep.clone();
          caches.open(CACHE).then(function(c){ c.put(req, copie); });
        }
        return rep;
      }).catch(function(){
        return cache || caches.match(BASE + "pos.html");
      });
      return cache || reseau;
    })
  );
});
