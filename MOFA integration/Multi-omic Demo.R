install.packages('UCSCXenaTools', repos = c('https://ropensci.r-universe.dev', 'https://cloud.r-project.org'))
install.packages("UCSCXenaTools")


library(curatedTCGAData)
library(MultiAssayExperiment)
library(SummarizedExperiment)
library(matrixStats)
library(MOFA2)
# Xena
library(UCSCXenaTools)
library(data.table)



merge_by_rows_union <- function(A, B) {
  if (is.null(A)) return(B)
  if (is.null(B)) return(A)
  rows <- union(rownames(A), rownames(B))
  # prepare empty matrices with union rows
  mA <- matrix(NA_real_, nrow=length(rows), ncol=ncol(A),
               dimnames=list(rows, colnames(A)))
  mB <- matrix(NA_real_, nrow=length(rows), ncol=ncol(B),
               dimnames=list(rows, colnames(B)))
  mA[rownames(A), ] <- as.matrix(A)
  mB[rownames(B), ] <- as.matrix(B)
  res <- cbind(mA, mB)
  return(res)
}

get_assay_safe <- function(mae_obj, pattern) {
  nms <- assayNames(mae_obj)
  sel <- grep(pattern, nms, ignore.case = TRUE, value = TRUE)
  if (length(sel) == 0) return(NULL)
  se <- experiments(mae_obj)[[sel[1]]]
  mat <- assay(se)
  mat <- as.matrix(mat)
  # convert columns to patient-level TCGA barcode (first 12 chars)
  colnames(mat) <- substr(colnames(mat), 1, 12)
  return(mat)
}

# 1) list available cohorts (disease codes) and choose which to include
#    Use all curatedTCGAData cohorts: curatedTCGAData(diseaseCode="*", dry.run=TRUE) lists them
avail <- curatedTCGAData(diseaseCode = "*", assays = "*", dry.run = TRUE)


# avail is a data.frame; first column likely disease codes (check structure)
print(head(avail))
disease_codes <- sort(unique(avail$DiseaseCode))  # depends on returned column name; fallback below
if (is.null(disease_codes) || length(disease_codes) == 0) {
  # fallback to common TCGA codes list (short)
  disease_codes <- c("ACC","BLCA","BRCA","CESC","CHOL","COAD","DLBC","ESCA","GBM",
                     "HNSC","KICH","KIRC","KIRP","LAML","LGG","LIHC","LUAD","LUSC",
                     "MESO","OV","PAAD","PCPG","PRAD","READ","SARC","SKCM","STAD",
                     "TGCT","THCA","THYM","UCEC","UCS","UVM")
}

# 2) Initialize empty aggregated view containers
pan_RNA  <- NULL
pan_miRNA <- NULL
pan_METH <- NULL
pan_CNV  <- NULL
pan_RPPA <- NULL

