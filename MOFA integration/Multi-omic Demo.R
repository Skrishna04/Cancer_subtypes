library(curatedTCGAData)
library(MultiAssayExperiment)
library(SummarizedExperiment)
library(matrixStats)
library(MOFA2)

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
