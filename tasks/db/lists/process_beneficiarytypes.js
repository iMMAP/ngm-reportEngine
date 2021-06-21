use ngmHealthCluster;
try {
    db.getCollection('beneficiarytypes').find({}).forEach(function (d) { if (d.cluster_id && d.cluster_id.length && !Array.isArray(d.cluster_id)) { d.cluster_id = JSON.parse(d.cluster_id); db.getCollection('beneficiarytypes').save(d); } });
    db.getCollection('beneficiarytypes').find({}).forEach(function (d) { if (d.category_type_id && d.category_type_id.length && !Array.isArray(d.category_type_id)) { d.category_type_id = JSON.parse(d.category_type_id); db.getCollection('beneficiarytypes').save(d); } });
} catch (err) {
    print(err);
    throw err;
}
