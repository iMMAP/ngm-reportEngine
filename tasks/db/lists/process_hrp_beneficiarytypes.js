use ngmHealthCluster;
try {
    db.getCollection('hrpbeneficiarytypes').find({}).forEach(function (d) { if (d.cluster_id && d.cluster_id.length && !Array.isArray(d.cluster_id)) { d.cluster_id = JSON.parse(d.cluster_id); db.getCollection('hrpbeneficiarytypes').save(d); } });
} catch (err) {
    print(err);
    throw err;
}
