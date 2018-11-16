import Model from 'ember-data/model';
import attr from 'ember-data/attr';
import { belongsTo, hasMany } from 'ember-data/relationships';

export default Model.create({
  start: attr('datetime'),
  einde: attr('datetime'),
  rangorde: attr('language-string'),
  uri: attr(),

  bekleedt: belongsTo('mandaat', {inverse: null }),
  isBestuurlijkeAliasVan: belongsTo('persoon', {inverse: 'isAangesteldAls'}),
  tijdelijkeVervangingen: hasMany('mandataris', {inverse: null })
});
