@@ .. @@
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">
                    Model Information
                  </h3>
                  <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
                    <div>
                      <label className="text-xs text-gray-500">
                        Model Number
                      </label>
                      <p className="font-medium">
                        {selectedAsset.model?.model_number || "N/A"}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">
                        Serial Number
                      </label>
                      <p className="font-medium">
                        {selectedAsset.model?.serial_number || "N/A"}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">
                        Age (Years)
                      </label>
                      <p className="font-medium">
                        {selectedAsset.model?.age || "N/A"}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Tonnage</label>
                      <p className="font-medium">
                        {selectedAsset.model?.tonnage || "N/A"}
                      </p>
                    </div>
+                    <div>
+                      <label className="text-xs text-gray-500">Unit Type</label>
+                      <p className="font-medium">
+                        {selectedAsset.model?.unit_type || "N/A"}
+                      </p>
+                    </div>
+                    <div>
+                      <label className="text-xs text-gray-500">
+                        System Type
+                      </label>
+                      <p className="font-medium">
+                        {selectedAsset.model?.system_type || "N/A"}
+                      </p>
+                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">
-                    System Information
+                    Inspection Information
                  </h3>
                  <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
-                    <div>
-                      <label className="text-xs text-gray-500">Unit Type</label>
-                      <p className="font-medium">
-                        {selectedAsset.model?.unit_type || "N/A"}
-                      </p>
-                    </div>
-                    <div>
-                      <label className="text-xs text-gray-500">
-                        System Type
-                      </label>
-                      <p className="font-medium">
-                        {selectedAsset.model?.system_type || "N/A"}
-                      </p>
-                    </div>
                    <div>
                      <label className="text-xs text-gray-500">
                        Inspection Date
                      </label>
                      <p className="font-medium">
                        {formatDate(selectedAsset.inspection_date)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>