/**
 * Copyright (C) 2014 KO GmbH <copyright@kogmbh.com>
 *
 * @licstart
 * This file is part of WebODF.
 *
 * WebODF is free software: you can redistribute it and/or modify it
 * under the terms of the GNU Affero General Public License (GNU AGPL)
 * as published by the Free Software Foundation, either version 3 of
 * the License, or (at your option) any later version.
 *
 * WebODF is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with WebODF.  If not, see <http://www.gnu.org/licenses/>.
 * @licend
 *
 * @source: http://www.webodf.org/
 * @source: https://github.com/kogmbh/WebODF/
 */

/*global document, window, runtime, FileReader, alert, Uint8Array, Blob, saveAs, Wodo*/

// "id", "docfilename", "content"
// EXAMPLE:
// var mh_texteditor = [
//     {"id": 0, "docfilename": "filename1", "content": ""}
// ];

var mh_texteditorperson = {"name": "Unknown Author"};

var mh_texteditor = [];

var presentfile_id = -1;


function createEditor() {
    "use strict";
    var editor = null,
        editorOptions,
        loadedFilename;

    /*jslint emptyblock: true*/
    /**
     * @return {undefined}
     */
    function startEditing() {
    }
    /*jslint emptyblock: false*/

    /**
     * extract document url from the url-fragment
     *
     * @return {?string}
     */
    function guessDocUrl() {
        var pos, docUrl = String(document.location);
        // If the URL has a fragment (#...), try to load the file it represents
        pos = docUrl.indexOf('#');
        if (pos !== -1) {
            docUrl = docUrl.substr(pos + 1);
        } else {
            docUrl = "doc.odt";
        }
        return docUrl || null;
    }

    function fileSelectHandler(evt) {
        var file, files, reader;
        files = (evt.target && evt.target.files) ||
            (evt.dataTransfer && evt.dataTransfer.files);
        function onLoadEnd() {
            if (reader.readyState === 2) {
                runtime.registerFile(file.name, reader.result);
                loadedFilename = file.name;
                document.getElementById("docfilename").value = loadedFilename;
                editor.openDocumentFromUrl(loadedFilename, startEditing);
            }
        }
        if (files && files.length === 1) {
            if (!editor.isDocumentModified() ||
                window.confirm("There are unsaved changes to the file. Do you want to discard them?")) {
                editor.closeDocument(function() {
                    presentfile_id = -1;
                    file = files[0];
                    reader = new FileReader();
                    reader.onloadend = onLoadEnd;
                    reader.readAsArrayBuffer(file);
                });
            }
        } else {
            alert("File could not be opened in this browser.");
        }
    }

    function enhanceRuntime() {
        var openedFiles = {},
            readFile = runtime.readFile;
        runtime.readFile = function (path, encoding, callback) {
            var array;
            if (openedFiles.hasOwnProperty(path)) {
                array = new Uint8Array(openedFiles[path]);
                callback(undefined, array);
            } else {
                return readFile(path, encoding, callback);
            }
        };
        runtime.registerFile = function (path, data) {
            openedFiles[path] = data;
        };
    }

    function createFileLoadForm() {
        var form = document.createElement("form"),
            input = document.createElement("input");

        function internalHandler(evt) {
            if (input.value !== "") {
                fileSelectHandler(evt);
            }
            // reset to "", so selecting the same file next time still trigger the change handler
            input.value = "";
        }
        form.appendChild(input);
        form.style.display = "none";
        input.id = "fileloader";
        input.setAttribute("type", "file");
        input.addEventListener("change", internalHandler, false);
        document.body.appendChild(form);
    }

    function load() {
        var form = document.getElementById("fileloader");
        if (!form) {
            enhanceRuntime();
            createFileLoadForm();
            form = document.getElementById("fileloader");
        }
        form.click();
    }

    function save() {
    //    if (editor.isDocumentModified()) {
        if (presentfile_id === -1) {
            var checkstr = window.confirm('Click "Cancel" if this file needs to be saved on the Files Listing/Search Panel, otherwise click "OK".');
            if (checkstr === false) {
                return;
            }
        }
        var thisfilename = docfilename.value;
        function saveByteArrayLocally(err, data) {
            if (err) {
                alert(err);
                return;
            }
            // TODO: odfcontainer should have a property mimetype
            var mimetype = "application/vnd.oasis.opendocument.text",
                filename = thisfilename || loadedFilename || "doc.odt",
                blob = new Blob([data.buffer], {type: mimetype});
            saveAs(blob, filename);
            // TODO: hm, saveAs could fail or be cancelled
            editor.setDocumentModified(false);
        }
        editor.getDocumentAsByteArray(saveByteArrayLocally);
    }


    var downloadfilebtn = document.getElementById("downloadfilebtn");
    downloadfilebtn.addEventListener("click", function () {
        if ((presentfile_id !== -1) && (editor.isDocumentModified())) {
            alert('existing doc, modified so save');
            savefilebtn.click();
        }
        save();
    });

    var uploadfilebtn = document.getElementById("uploadfilebtn");
    uploadfilebtn.addEventListener("click", function () {
        if ((editor.isDocumentModified()) && (presentfile_id !== -1)) {
            savefilebtn.click();
        }
        load();
    });


    editorOptions = {
        loadCallback: load,
        saveCallback: save,
        allFeaturesEnabled: true
    };

    function onEditorCreated(err, e) {
        var docUrl = guessDocUrl();

        if (err) {
            // something failed unexpectedly
            alert(err);
            return;
        }

    //    var person = prompt("Please enter your name.");
        var person;
        if (mh_texteditorperson.name === "Unknown Author") {
            person = prompt("Please enter your name.");
            if ((person !== null) && (person.trim() !== "")) {
                person = person.trim();
                mh_texteditorperson.name = person;
            } else {
                person = "Unknown Author";
            }
        } else {
            person = mh_texteditorperson.name;
        }

        editor = e;
        editor.setUserData({
            fullName: person,
            color:    "black"
        });
    /*
        editor.setUserData({
            fullName: "WebODF-Curious",
            color:    "black"
        });
    */

        window.addEventListener("beforeunload", function (e) {
            var confirmationMessage = "There are unsaved changes to the file.";
            if (editor.isDocumentModified()) {
                // Gecko + IE
                (e || window.event).returnValue = confirmationMessage;
                // Webkit, Safari, Chrome etc.
                return confirmationMessage;
            }
            saveMHTextEditor();
        });


        var filenamediv = document.getElementById("filename_div");
        var filenameinput = document.getElementById("filenameinput");
        var nametype = document.getElementById("nametype");

        var docfilename = document.getElementById("docfilename");
        docfilename.addEventListener("click", function () {
          if (docfilename.value !== "doc.odt") {
            nametype.value = "modifyfunc";
            if (filenamediv.style.display !== "block") {
               filenamediv.style.display = "block";
               filenameinput.value = docfilename.value.slice(0,-4);
            }
          }
        });

        function update_fileslisting(srchinput) {
            "use strict";
            var i, fileslist_items = "", this_list = document.getElementById("fileslisting");
            var searchtext = document.getElementById("searchtext");
            this_list.innerHTML = null;
            if (srchinput === null) {
                document.getElementById("searchfiles").value = "";
            }
            for (i = mh_texteditor.length - 1; i >= 0; i-=1) {
                if ((srchinput === null) || (mh_texteditor[i].docfilename.toLowerCase().indexOf(srchinput) > -1) || ((searchtext.checked === true) && (mh_texteditor[i].textfile.toLowerCase().indexOf(srchinput) > -1))) {
                    fileslist_items = fileslist_items + '<p><button id="deletebtn' + mh_texteditor[i].id + '" class="deletefilebtn" title="Delete ' + mh_texteditor[i].docfilename + '"><img src="images/glyphicons-208-remove.png"></button><button id="editbtn' + mh_texteditor[i].id + '" class="editfilebtn" title="Edit ' + mh_texteditor[i].docfilename + '"><img src="images/glyphicons-151-edit.png"></button>' + mh_texteditor[i].docfilename + '</p>';
                }
            }
            this_list.innerHTML = fileslist_items;
            var j, editbtns = document.querySelectorAll(".editfilebtn");
            for (j = 0; j < editbtns.length; j+=1) {
                editbtns[j].addEventListener("click", function() {
                    editfile(this.id.slice(7));
               });
            }
            var k, deletebtns = document.querySelectorAll(".deletefilebtn");
            for (k = 0; k < deletebtns.length; k+=1) {
                deletebtns[k].addEventListener("click", function() {
                    deletefile(this.id.slice(9));
               });
            }
            var deletediv = document.getElementById("deletediv");
            var filesessionmsg = document.getElementById("filesessionmsg");
            if (mh_texteditor.length > 0) {
                deletediv.style.display = "block";
                filesessionmsg.style.display = "block";
            } else {
                deletediv.style.display = "none";
                filesessionmsg.style.display = "none";
            }
            return;
        }




        var cancelfilename = document.getElementById("cancelfilename");
        cancelfilename.addEventListener("click", function (e) {
          e.preventDefault();
          filenameinput.value = "";
          nametype.value = "newfunc";
          filenamediv.style.display = "none";
        });

        var submitfilename = document.getElementById("submitfilename");
        submitfilename.addEventListener("click", function (e) {
           e.preventDefault();
           var thisfilename = filenameinput.value.trim();
           if (thisfilename === "") {
              alert("Input file name!");
              filenameinput.value = "";
           } else if (thisfilename === "doc") {
              alert('File name must not be "doc.odt"!');    
              filenameinput.value = "";
           } else {
              thisfilename = thisfilename + ".odt";
              var j = -1, found = false;
              while ((found === false) && (j < mh_texteditor.length - 1)) {
                j += 1;
                if (thisfilename === mh_texteditor[j].docfilename) {
                  found = true;
                  alert("File name already exists!");
                }
              }
              if (found === false) {
                docfilename.value = thisfilename;
                filenameinput.value = "";
                filenamediv.style.display = "none";
                if (nametype.value === "newfunc") {
                  savefilebtn.click();
                } else if (nametype.value === "modifyfunc") {
                  nametype.value = "newfunc";
                  mh_texteditor[presentfile_id].docfilename = docfilename.value;
                  savefilebtn.click();
                } else if (nametype.value === "copyfunc") {
                  nametype.value = "newfunc";
                  duplicateFile();
                } else {
                  alert("Error, illegal submit name type!");
                  nametype.value = "newfunc";
                }
              }
           }
        });


        function filenameform() {
          filenamediv.style.display = "block";
          return;
        }

        var newfilebtn = document.getElementById("newfilebtn");
        newfilebtn.addEventListener("click", function(e) {
          e.preventDefault();
          if (presentfile_id !== -1) {
            reloadbtn.click();
          }
          filenameform();
        });



        function saveFile() {
            "use strict";
            var thisfile = docfilename.value;
            var canvasinfo = document.querySelectorAll(".webodfeditor-canvascontainer");
            if (presentfile_id === -1) {
                var this_group = {};
                if (mh_texteditor.length > 0) {
                    var this_id = Number(mh_texteditor[mh_texteditor.length - 1].id) + 1;
                } else {
                    this_id = 0;
                }
                this_group.id = this_id;
                this_group.docfilename = thisfile;
                this_group.textfile = canvasinfo[0].textContent;
                mh_texteditor.push(this_group);
                presentfile_id = this_id;
            } else {
                mh_texteditor[presentfile_id].textfile = canvasinfo[0].textContent;
                mh_texteditor[presentfile_id].docfilename = thisfile;
            }
            loadedFilename = thisfile;
            function saveByteArrayContent(err, data) {
                if (err) {
                    alert(err);
                    return;
                }
                // TODO: odfcontainer should have a property mimetype
                var mimetype = "application/vnd.oasis.opendocument.text",
                    filename = mh_texteditor[presentfile_id].docfilename,
                    blob = new Blob([data.buffer], {type: mimetype});
                mh_texteditor[presentfile_id].content = blob;
                editor.setDocumentModified(false);
            }
            editor.getDocumentAsByteArray(saveByteArrayContent);
            update_fileslisting(null);
        }

        
        function checkValid() {
            var validname = false;
            var thisdocfilename = docfilename.value.trim();
            docfilename.value = thisdocfilename;
            if (thisdocfilename === "") {
                alert("Must input doc file name!");
            } else {
                if (thisdocfilename.toLowerCase() === "doc.odt") {
                    alert('Doc file name must not be "doc.odt"!');
                } else {
                    validname = true;
                }
            }
            return validname;
        }


        function checkName() {
            var i = -1, found = false;
            while ((found === false) && (i < mh_texteditor.length - 1)) {
                i += 1;
                if (mh_texteditor[i].docfilename.toLowerCase() === docfilename.value.toLowerCase()) {
                    found = true;
                }
            }
            if (found === true) {
                return(i);
            } else {
                return(-1);
            }
        }



        var savefilebtn = document.getElementById("savefilebtn");
        savefilebtn.addEventListener("click", function () {
            var validname = checkValid();
            if (validname === true) {
                var found = checkName();
                if (presentfile_id === -1) {
                    if (found > -1) {
                        alert("Change the file name, this one already exists!");
                        docfilename.value = "doc.odt";
                        return;
                    }
                } else {
                    if ((found !== -1) && (found !== presentfile_id)) {
                        alert("That file name already exists for another file!");
                        docfilename.value = mh_texteditor[presentfile_id].docfilename;
                        return;
                    }
                }
                saveFile();
            }
        });




        function duplicateFile() {
            "use strict";
            var canvasinfo = document.querySelectorAll(".webodfeditor-canvascontainer");
            var this_group = {};
            this_group.id = Number(mh_texteditor[mh_texteditor.length - 1].id) + 1;
            this_group.docfilename = docfilename.value;
            this_group.textfile = canvasinfo[0].textContent;
            mh_texteditor.push(this_group);
            presentfile_id = this_group.id;
            loadedFilename = docfilename.value;
            function saveByteArrayContent(err, data) {
                if (err) {
                    alert(err);
                    return;
                }
                // TODO: odfcontainer should have a property mimetype
                var mimetype = "application/vnd.oasis.opendocument.text",
                    filename = mh_texteditor[presentfile_id].docfilename,
                    blob = new Blob([data.buffer], {type: mimetype});
                mh_texteditor[presentfile_id].content = blob;
                editor.setDocumentModified(false);
            }
            editor.getDocumentAsByteArray(saveByteArrayContent);
            update_fileslisting(null);
        }

        
        var duplicatefilebtn = document.getElementById("duplicatefilebtn");
        duplicatefilebtn.addEventListener("click", function () {
            if (presentfile_id !== -1) {
                nametype.value = "copyfunc";
                filenameform();
            } else {
                alert("May not duplicate unsaved file!");
            }
        });


        var reloadbtn = document.getElementById("reloadbtn");
        reloadbtn.addEventListener("click", function () {
            if (editor.isDocumentModified()) {
                if (presentfile_id !== -1) {
                    savefilebtn.click();
                } else {
                    var checkstr = window.confirm('Click "Cancel" if this file needs to be saved first, otherwise click "OK".');
                    if (checkstr === false) {
                        filenameform();
                        return;
                    }
                }
            }
            editor.closeDocument(function() {
                filenameinput.value = "";
                nametype.value = "newfunc";
                filenamediv.style.display = "none";
                closeSliderbtn.click();
                presentfile_id = -1;
                loadedFilename = "doc.odt";
                docfilename.value = "doc.odt";
                var reader = new FileReader();
                var file =  "doc.odt";
                editor.openDocumentFromUrl(file, startEditing);
                reader.readAsArrayBuffer(file);
            });
        });



        function editfile(btnid) {
            "use strict";
            if (Number(btnid) !== presentfile_id) {
                if (editor.isDocumentModified()) {
                    if (presentfile_id !== -1) {
                        savefilebtn.click();
                    } else {
                        var checkstr = window.confirm('Click "Cancel" if this file needs to be saved first, otherwise click "OK".');
                        if (checkstr === false) {
                            return;
                        }
                    }
                }
                var found = false, i = -1;
                while ((found === false) && (i < mh_texteditor.length)) {
                    i += 1;
                    if (mh_texteditor[i].id === Number(btnid)) {
                        found = true;
                    }
                }
                if (found === true) {
                    editor.closeDocument(function() {
                        presentfile_id = Number(mh_texteditor[i].id);
                        var reader = new FileReader();
                        loadedFilename = mh_texteditor[i].docfilename;
                        docfilename.value = loadedFilename;
                        var filecontent = mh_texteditor[i].content;
                        var file = URL.createObjectURL(filecontent);
                        editor.openDocumentFromUrl(file, startEditing);
                        reader.readAsArrayBuffer(file);
                    });
                } else {
                    alert("Error, file not found!");
                }
            } else {
                alert("This file is displayed!");
            }
        }


        function deletefile(btnid) {
            "use strict";
            var checkstr = window.confirm('Sure you want to delete this file?');
            if (checkstr === false) {
                return;
            }
            var found = false, i = -1;
            while ((found === false) && (i < mh_texteditor.length)) {
                i += 1;
                if (mh_texteditor[i].id === Number(btnid)) {
                    found = true;
                }
            }
            if (found === true) {
                mh_texteditor.splice(i, 1);
                if (Number(btnid) === presentfile_id) {
                   reloadbtn.click();
                }
                update_fileslisting(null);
            } else {
                alert("Error, file not found!");
            }
        }



        function findFiles() {
            "use strict";
            document.getElementById("searchfiles").value = document.getElementById("searchfiles").value.trim();
            var searchinput = document.getElementById("searchfiles").value.toLowerCase();
            if (searchinput !== "") {
                update_fileslisting(searchinput);
            } else {
                alert("Input search info!");
            }
        }

        var searchinput = document.getElementById("searchfiles");
        searchfiles.addEventListener("change", function () {
            "use strict";
            if (searchfiles.value === "") {
                update_fileslisting(null);
            }
        });

        var searchbtn = document.getElementById("searchbtn");
        searchbtn.addEventListener("click", function () {
            "use strict";
            findFiles();
        });

        var resetuserbtn = document.getElementById("resetuserbtn");
        resetuserbtn.addEventListener("click", function () {
            "use strict";
            var checkstr = window.confirm('User name will be reset to default "Unknown Author" next user session. OK?');
            if (checkstr === false) {
                return;
            }
            mh_texteditorperson.name = "Unknown Author";
            person = "Unknown Author";
        });

        var deleteallbtn = document.getElementById("deleteallbtn");
        deleteallbtn.addEventListener("click", function () {
            "use strict";
            if (mh_texteditor.length > 0) {
                var checkstr = window.confirm("Sure you want to delete all files from the listing?");
                if (checkstr === false) {
                    return;
                }
                mh_texteditor.length = 0;
                update_fileslisting(null);
            } else {
                alert("No files to delete!");
            }
        });


        if (docUrl) {
            loadedFilename = docUrl;
            editor.openDocumentFromUrl(docUrl, startEditing);
        }
    }

    Wodo.createTextEditor('editorContainer', editorOptions, onEditorCreated);
}
