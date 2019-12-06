@lblod/ember-rdfa-editor-stemming-module-plugin
==============================================================================

Plugin to manage 'stemming' in a BehandelingVanAgendapunt


Compatibility
------------------------------------------------------------------------------

* Ember.js v3.4 or above
* Ember CLI v2.13 or above
* Node.js v8 or above


Installation
------------------------------------------------------------------------------

```
ember install ember-rdfa-editor-stemming-module-plugin
```


Usage
------------------------------------------------------------------------------
The following should be inserted in your document
```
<div resource="http://data.lblod.info/id/behandelingen-van-agendapunten/${generateUuid('bva-nr-3')}" typeof="besluit:BehandelingVanAgendapunt">
  <span property="ext:insertStemmingText">Beheer de stemmingen bij dit agendapunt</span>
</div>
```

You need to make sure the RDFA parent of the instructive
```
<span property="ext:insertStemmingText">Beheer de stemmingen bij dit agendapunt</span>
```
is a 'BehandelingVanAgendapunt'.

Contributing
------------------------------------------------------------------------------

See the [Contributing](CONTRIBUTING.md) guide for details.


License
------------------------------------------------------------------------------

This project is licensed under the [MIT License](LICENSE.md).
