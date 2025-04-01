# MediaNeo - Media Browser für FilePond

MediaNeo ist ein erweiterter Media Browser für das [FilePond Uploader AddOn](https://github.com/KLXM/filepond_uploader) in REDAXO. Es erweitert FilePond um eine bequeme Medienbibliothek-Browsing-Funktion, während es die leistungsstarken Upload-Funktionen von FilePond nutzt.

## Features

- **Elegante Medienauswahl:** Moderne Benutzeroberfläche für die Auswahl von Medien aus dem Medienpool
- **Kategoriebasierte Navigation:** Einfache Navigation durch die Medienkategorien
- **FilePond-Integration:** Nahtlose Integration mit dem FilePond Uploader AddOn
- **Drag & Drop Sortierung:** Einfaches Neuanordnen der ausgewählten Medien
- **YForm-Integration:** Eigenes Value-Field für einfache Nutzung in YForm
- **Responsive Design:** Optimale Nutzung auf allen Geräten

## Voraussetzungen

- REDAXO 5.13 oder höher
- PHP 7.4 oder höher
- FilePond Uploader AddOn
- YForm (optional für YForm Value Field)

## Installation

1. Das MediaNeo AddOn über den REDAXO Installer herunterladen
2. Sicherstellen, dass das FilePond Uploader AddOn installiert ist (wird als Abhängigkeit installiert)
3. MediaNeo installieren

## Verwendung

### Als Input-Feld in Modulen

```html
<input type="text" name="REX_INPUT_VALUE[1]" value="REX_VALUE[1]" class="medianeo">
```

### Als YForm Value Field

```php
$yform->setValueField('medianeo', [
    'name' => 'medien',
    'label' => 'Medienbibliothek',
    'types' => 'image/*,video/*,application/pdf',
    'maxfiles' => 5,
    'category' => 1,
    'multiple' => 1
]);
```

PIPE-Syntax:
```
medianeo|medien|Medienbibliothek|image/*,video/*|5|1|1|Bitte Medien auswählen
```

### Ausgabe im Template/Modul

```php
<?php
$mediaIds = explode(',', REX_VALUE[id=1 output=var]);

foreach($mediaIds as $mediaId) {
    $sql = rex_sql::factory();
    $sql->setQuery('SELECT filename FROM ' . rex::getTable('media') . ' WHERE id = :id', [':id' => $mediaId]);
    
    if ($sql->getRows() === 0) {
        continue;
    }
    
    $filename = $sql->getValue('filename');
    $media = rex_media::get($filename);
    
    if($media) {
        if($media->isImage()) {
            echo '<img 
                src="' . $media->getUrl() . '" 
                alt="' . $media->getValue('med_alt') . '" 
                title="' . $media->getTitle() . '"
            >';
        } else {
            echo '<a href="' . $media->getUrl() . '">' . $media->getFilename() . '</a>';
        }
    }
}
?>
```

## Optimierungen

MediaNeo wurde speziell entwickelt, um optimal mit FilePond zusammenzuarbeiten:

1. **Fokussiert auf Medien-Browsing:** Während FilePond den Upload-Teil übernimmt, konzentriert sich MediaNeo auf das Durchsuchen und Auswählen vorhandener Medien.

2. **Gemeinsame Konfigurationsnutzung:** MediaNeo nutzt die Konfigurationseinstellungen von FilePond für Kategorien, Dateitypen und mehr.

3. **Fixierter Übernehmen-Button:** Der Button zum Übernehmen der ausgewählten Medien ist immer sichtbar am unteren Rand fixiert.

4. **Optimierte Medienliste:** Die Liste der Medien ist scrollbar und passt sich optimal der Viewport-Höhe an.

## Konfiguration

Die Konfiguration von MediaNeo erfolgt über die Einstellungsseite im REDAXO-Backend. Folgende Optionen stehen zur Verfügung:

- **Erlaubte Dateitypen:** MIME-Types, die im MediaNeo ausgewählt werden können
- **Vorschaugröße:** Größe der Medienvorschaubilder in Pixeln

## API

### JavaScript-API

```javascript
// MediaNeo manuell initialisieren
initMediaNeoFields();

// MediaNeo Browser öffnen
document.querySelector('input.medianeo').dispatchEvent(new Event('medianeo:open'));
```

## Lizenz

MIT

## Credits

- Entwickelt von Thomas Skerbis KLXM Crossmedia GmbH
- FilePond Integration in Zusammenarbeit mit dem [FilePond Uploader AddOn](https://github.com/KLXM/filepond_uploader) von KLXM Crossmedia GmbH
