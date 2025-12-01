# 1) Do a basic internet check
if (!requireNamespace("curl", quietly=TRUE)) install.packages("curl")
curl::has_internet()

# 2) Try fetching Bioconductor homepage (shows if SSL/network ok)
url <- "https://bioconductor.org"
tryCatch(readLines(url, n = 1), error = function(e) e)

# 3) See current repos
getOption("repos")

# inside R, set for the session (replace host/port/user/pass if needed)
Sys.setenv(http_proxy  = "http://proxy.myorg.com:8080")
Sys.setenv(https_proxy = "http://proxy.myorg.com:8080")
# If authentication required:
# Sys.setenv(http_proxy  = "http://user:pass@proxy.myorg.com:8080")
options(download.file.method = "libcurl")



# --- Install (one-time) ---

if (!requireNamespace("BiocManager", quietly=TRUE)) install.packages("BiocManager")
BiocManager::install(c( "SummarizedExperiment", "ExperimentHub", "BiocGenerics", "matrixStats", "basilisk"))

library(curatedTCGAData)
library(MultiAssayExperiment)
library(MOFA2)
library(SummarizedExperiment)

